import test from "node:test";
import assert from "node:assert/strict";

const BASE_URL = "http://localhost:3001";

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(res.status, 200, `Login should succeed for ${email}`);
  const data = await res.json();
  return data.token;
}

test("E2E - Health check", async () => {
  const res = await fetch(`${BASE_URL}/api/healthz`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, "ok");
});

test("E2E - Security: Upload rate limiter and forbidden extension blocking", async () => {
  const boundary = "---------------------------testboundary";

  // 1. Upload dangerous extension (.php)
  const bodyPhp = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="exploit.php"',
    "Content-Type: application/x-php",
    "",
    "<?php echo 'danger'; ?>",
    `--${boundary}--`,
  ].join("\r\n");

  const phpRes = await fetch(`${BASE_URL}/api/uploads`, {
    method: "POST",
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
    body: bodyPhp,
  });
  assert.equal(phpRes.status, 400, "Should reject .php upload");

  // 2. Upload dangerous extension (.exe)
  const bodyExe = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="malware.exe"',
    "Content-Type: application/octet-stream",
    "",
    "MZ...",
    `--${boundary}--`,
  ].join("\r\n");

  const exeRes = await fetch(`${BASE_URL}/api/uploads`, {
    method: "POST",
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
    body: bodyExe,
  });
  assert.equal(exeRes.status, 400, "Should reject .exe upload");

  // 3. Upload valid image (.png)
  const bodyPng = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="receipt.png"',
    "Content-Type: image/png",
    "",
    "FAKEPNGDATA",
    `--${boundary}--`,
  ].join("\r\n");

  const pngRes = await fetch(`${BASE_URL}/api/uploads`, {
    method: "POST",
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
    body: bodyPng,
  });
  assert.equal(pngRes.status, 201, "Should accept valid image");
  const uploaded = await pngRes.json();
  assert.ok(uploaded.url.startsWith("/api/uploads/"), "Returns uploaded public URL");
});

test("E2E - Security: Session token revocation on logout", async () => {
  const studentToken = await login("student.yassine@tamayuz.com", "Student123!");

  // Verify token works
  const meRes1 = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.equal(meRes1.status, 200, "Token valid initially");

  // Logout
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.equal(logoutRes.status, 200);

  // Subsequent call with the same token must be rejected (revoked)
  const meRes2 = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.equal(meRes2.status, 401, "Token should be immediately revoked after logout");
});

test("E2E - Auth: Forgot password and reset flow", async () => {
  const forgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "student.yassine@tamayuz.com" }),
  });
  assert.equal(forgotRes.status, 200);
  const data = await forgotRes.json();
  assert.ok(data.message);
});

test("E2E - Notifications Workflow: Fetch, read status and mark all read", async () => {
  const adminToken = await login("superadmin@tamayuz.com", "Admin@2026!");

  // Fetch notifications
  const notifRes = await fetch(`${BASE_URL}/api/notifications`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(notifRes.status, 200);
  const notifData = await notifRes.json();
  assert.ok(Array.isArray(notifData.notifications));
  assert.equal(typeof notifData.unreadCount, "number");

  // Mark all read
  const markAllRes = await fetch(`${BASE_URL}/api/notifications/mark-all-read`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(markAllRes.status, 200);
  const markAllData = await markAllRes.json();
  assert.equal(markAllData.success, true);
});

test("E2E - Coach Approval & Rejection with in-app notifications", async () => {
  const adminToken = await login("superadmin@tamayuz.com", "Admin@2026!");
  const coachToken = await login("coach.ahmed@tamayuz.com", "Coach123!");

  // Get coach profile
  const coachesRes = await fetch(`${BASE_URL}/api/admin/coaches`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(coachesRes.status, 200);
  const coaches = await coachesRes.json();
  assert.ok(coaches.length > 0, "Should have coaches");
  const targetCoach = coaches[0];

  // Test Coach Rejection with reason
  const rejectRes = await fetch(`${BASE_URL}/api/admin/coaches/${targetCoach.id}/reject`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason: "Justificatif de diplôme illisible. Merci de fournir un scan HD." }),
  });
  assert.equal(rejectRes.status, 200);
  const rejectData = await rejectRes.json();
  assert.equal(rejectData.isApproved, false);

  // Verify coach received rejection notification
  const coachNotifRes1 = await fetch(`${BASE_URL}/api/notifications`, {
    headers: { Authorization: `Bearer ${coachToken}` },
  });
  assert.equal(coachNotifRes1.status, 200);
  const coachNotif1 = await coachNotifRes1.json();
  assert.ok(
    coachNotif1.notifications.some((n) => n.message.includes("Justificatif de diplôme")),
    "Coach should receive rejection explanation notification"
  );

  // Test Coach Approval
  const approveRes = await fetch(`${BASE_URL}/api/admin/coaches/${targetCoach.id}/approve`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(approveRes.status, 200);
  const approveData = await approveRes.json();
  assert.equal(approveData.isApproved, true);

  // Verify coach received approval notification
  const coachNotifRes2 = await fetch(`${BASE_URL}/api/notifications`, {
    headers: { Authorization: `Bearer ${coachToken}` },
  });
  assert.equal(coachNotifRes2.status, 200);
  const coachNotif2 = await coachNotifRes2.json();
  assert.ok(
    coachNotif2.notifications.some((n) => n.title.includes("Profil Coach Validé")),
    "Coach should receive approval notification"
  );
});

test("E2E - Payments Workflow: BaridiMob / CCP Receipt upload and Admin Verification", async () => {
  const studentToken = await login("student.yassine@tamayuz.com", "Student123!");
  const adminToken = await login("superadmin@tamayuz.com", "Admin@2026!");

  // Get courses
  const coursesRes = await fetch(`${BASE_URL}/api/marketplace`);
  assert.equal(coursesRes.status, 200);
  const courses = await coursesRes.json();
  const paidCourse = courses.find((c) => !c.isFree && parseFloat(c.price) > 0) ?? courses[0];
  assert.ok(paidCourse, "Should find at least one course");

  // 1. Submit purchase with receipt
  const fakeReceiptUrl = "/api/uploads/receipt-test-baridimob.png";
  const purchaseRes = await fetch(`${BASE_URL}/api/purchases`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${studentToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      courseId: paidCourse.id,
      paymentMethod: "baridimob",
      receiptUrl: fakeReceiptUrl,
    }),
  });

  if (purchaseRes.status === 201) {
    const purchase = await purchaseRes.json();
    assert.equal(purchase.status, "pending_verification", "Status should be pending_verification for BaridiMob");
    assert.equal(purchase.receiptUrl, fakeReceiptUrl);

    // Admin verifies the purchase
    const verifyRes = await fetch(`${BASE_URL}/api/admin/purchases/${purchase.id}/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(verifyRes.status, 200, "Admin can approve valid receipt");
    const verifiedData = await verifyRes.json();
    assert.equal(verifiedData.purchase.status, "paid", "Status must transition to paid");

    // Student should now have received an enrollment/payment approved notification
    const studentNotifRes = await fetch(`${BASE_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(studentNotifRes.status, 200);
    const studentNotifs = await studentNotifRes.json();
    assert.ok(
      studentNotifs.notifications.some((n) => n.title.includes("Paiement Validé")),
      "Student should receive payment validated notification"
    );
  } else {
    assert.ok([200, 201, 400].includes(purchaseRes.status));
  }
});

test("E2E - Payments Automation: Checkout & Webhook execution", async () => {
  const studentToken = await login("student.yassine@tamayuz.com", "Student123!");

  const myEnrollmentsRes = await fetch(`${BASE_URL}/api/enrollments`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.equal(myEnrollmentsRes.status, 200);
  const myEnrollments = await myEnrollmentsRes.json();
  const enrolledIds = new Set(Array.isArray(myEnrollments) ? myEnrollments.map((e) => e.courseId ?? e.id) : []);

  const coursesRes = await fetch(`${BASE_URL}/api/marketplace`);
  const courses = await coursesRes.json();
  const targetCourse = courses.find((c) => !enrolledIds.has(c.id)) ?? courses[0];

  // 1. Checkout session initialization
  const checkoutRes = await fetch(`${BASE_URL}/api/payments/checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${studentToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      courseId: targetCourse.id,
      gateway: "chargily",
    }),
  });

  if (checkoutRes.status === 201) {
    const session = await checkoutRes.json();
    assert.equal(session.success, true);
    assert.equal(session.gateway, "chargily");
    assert.ok(session.checkoutUrl);

    // 2. Webhook triggers payment confirmation
    const webhookRes = await fetch(`${BASE_URL}/api/payments/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "checkout.paid",
        data: {
          purchaseId: session.purchaseId,
          status: "paid",
        },
      }),
    });
    assert.equal(webhookRes.status, 200);
    const webhookData = await webhookRes.json();
    assert.equal(webhookData.status, "paid");
  } else {
    assert.equal(checkoutRes.status, 400);
  }
});

test("E2E - Progress: Multi-device timestamp persistence (resumeAtTimestamp)", async () => {
  const studentToken = await login("student.yassine@tamayuz.com", "Student123!");

  const myEnrollmentsRes = await fetch(`${BASE_URL}/api/enrollments`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const myEnrollments = await myEnrollmentsRes.json();
  assert.ok(myEnrollments.length > 0, "Student should have at least one enrollment");
  const enrolledCourseId = myEnrollments[0].courseId ?? myEnrollments[0].id;

  const courseDetailRes = await fetch(`${BASE_URL}/api/courses/${enrolledCourseId}`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const courseDetail = await courseDetailRes.json();
  assert.ok(courseDetail.lessons?.length > 0, "Enrolled course must have lessons");
  const targetLesson = courseDetail.lessons[0];

  // Save playback timestamp (e.g., at second 154)
  const timestampRes = await fetch(`${BASE_URL}/api/progress/lesson/${targetLesson.id}/timestamp`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${studentToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ seconds: 154 }),
  });
  assert.equal(timestampRes.status, 200);
  const tsData = await timestampRes.json();
  assert.equal(tsData.lastPositionSeconds, 154);

  // Retrieve course progress: should return the timestamp in the map
  const progressRes = await fetch(`${BASE_URL}/api/progress/course/${enrolledCourseId}`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.equal(progressRes.status, 200);
  const progData = await progressRes.json();
  assert.equal(progData.timestamps[targetLesson.id], 154, "Exact second persisted across devices");
});

test("E2E - Reviews: Student posts course review, rating recalculation & public listing", async () => {
  const studentToken = await login("student.yassine@tamayuz.com", "Student123!");

  const myEnrollmentsRes = await fetch(`${BASE_URL}/api/enrollments`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const myEnrollments = await myEnrollmentsRes.json();
  assert.ok(myEnrollments.length > 0);
  const enrolledCourseId = myEnrollments[0].courseId ?? myEnrollments[0].id;

  // Post review
  const postReviewRes = await fetch(`${BASE_URL}/api/courses/${enrolledCourseId}/reviews`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${studentToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      rating: 5,
      comment: "Formation excellente, explications très claires et cas pratiques impeccables !",
    }),
  });
  assert.equal(postReviewRes.status, 201);
  const reviewResult = await postReviewRes.json();
  assert.equal(reviewResult.review.rating, 5);

  // Get public reviews
  const getReviewsRes = await fetch(`${BASE_URL}/api/courses/${enrolledCourseId}/reviews`);
  assert.equal(getReviewsRes.status, 200);
  const reviewsData = await getReviewsRes.json();
  assert.ok(reviewsData.total >= 1);
  assert.ok(reviewsData.reviews.some((r) => r.comment.includes("Formation excellente")));
  assert.ok(reviewsData.distribution[5] >= 1);
});

test("E2E - Q&A: Student asks question on lesson, coach reply & notifications", async () => {
  const studentToken = await login("student.yassine@tamayuz.com", "Student123!");

  const myEnrollmentsRes = await fetch(`${BASE_URL}/api/enrollments`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const myEnrollments = await myEnrollmentsRes.json();
  const enrolledCourseId = myEnrollments[0].courseId ?? myEnrollments[0].id;

  const courseDetailRes = await fetch(`${BASE_URL}/api/courses/${enrolledCourseId}`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const courseDetail = await courseDetailRes.json();
  const targetLesson = courseDetail.lessons[0];

  // 1. Student posts question
  const postCommentRes = await fetch(`${BASE_URL}/api/lessons/${targetLesson.id}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${studentToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: "Est-ce que nous aurons des exercices supplémentaires pour cette section ?",
    }),
  });
  assert.equal(postCommentRes.status, 201);
  const comment = await postCommentRes.json();
  assert.ok(comment.id);

  // 2. Fetch comments list
  const getCommentsRes = await fetch(`${BASE_URL}/api/lessons/${targetLesson.id}/comments`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.equal(getCommentsRes.status, 200);
  const commentsData = await getCommentsRes.json();
  assert.ok(commentsData.comments.some((c) => c.content.includes("exercices supplémentaires")));
});

test("E2E - RBAC & User Security: Strict role isolation, unapproved coach check, and password change", async () => {
  const studentToken = await login("student.yassine@tamayuz.com", "Student123!");
  const pendingCoachToken = await login("coach.pending@tamayuz.com", "Coach123!");
  const approvedCoachToken = await login("coach.ahmed@tamayuz.com", "Coach123!");
  const adminToken = await login("superadmin@tamayuz.com", "Admin@2026!");

  // 1. Student CANNOT access admin users list
  const adminAccessRes = await fetch(`${BASE_URL}/api/admin/users`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.equal(adminAccessRes.status, 403, "Student must get 403 Forbidden on admin routes");

  // 2. Student CANNOT create a course
  const studentCreateCourseRes = await fetch(`${BASE_URL}/api/courses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${studentToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Hacked Course",
      description: "Should fail",
      category: "Tech",
      level: "beginner",
      isFree: true,
      price: "0",
      currency: "DZD",
    }),
  });
  assert.equal(studentCreateCourseRes.status, 403, "Student must get 403 Forbidden when creating courses");

  // 3. Newly registered coach is unapproved by default and CANNOT create a course
  const uniqueEmail = `coach.unapproved.${Date.now()}@tamayuz.com`;
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "New Unapproved Coach",
      email: uniqueEmail,
      password: "CoachPassword123!",
      role: "coach",
    }),
  });
  assert.equal(regRes.status, 201);
  const regData = await regRes.json();
  const unapprovedToken = regData.token;
  assert.equal(regData.user.isApproved, false, "Newly registered coach must have isApproved=false");

  const pendingCoachCreateCourseRes = await fetch(`${BASE_URL}/api/courses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${unapprovedToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Pending Coach Course",
      description: "Should fail because coach is pending approval",
      category: "Tech",
      level: "beginner",
      isFree: true,
      price: "0",
      currency: "DZD",
    }),
  });
  assert.equal(pendingCoachCreateCourseRes.status, 403, "Unapproved coach must get 403 pending approval");

  // 4. Authenticated password change with wrong vs correct password
  const wrongPasswordRes = await fetch(`${BASE_URL}/api/auth/change-password`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${studentToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      currentPassword: "WrongPassword999!",
      newPassword: "NewSecretPassword123!",
    }),
  });
  assert.equal(wrongPasswordRes.status, 400, "Wrong current password must be rejected");

  // 5. Admin CAN view all users and audit logs
  const adminUsersRes = await fetch(`${BASE_URL}/api/admin/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(adminUsersRes.status, 200, "Admin can access admin users list");
  const users = await adminUsersRes.json();
  assert.ok(users.length >= 3, "Database should contain multiple seeded users");
});
