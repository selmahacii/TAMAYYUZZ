const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_9uXMe4xpLZoC@ep-spring-mode-ba1olrfk-pooler.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  const ticketsToInsert = [
    {
      user_id: 70,
      subject: "Litige et demande de remboursement suite à un double prélèvement BaridiMob",
      description: "Lors de mon inscription à la formation Marketing Digital, la transaction BaridiMob a été débitée deux fois (Transaction #BM-88912 et #BM-88913 pour un montant total de 9 000 DZD). Je sollicite la médiation de l'administration et le remboursement du trop-perçu sur mon RIP postal.",
      status: "open",
      priority: "urgent",
      category: "billing",
      resolution: null,
      created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    },
    {
      user_id: 71,
      subject: "Contestation : reçu CCP validé mais cours toujours bloqué",
      description: "J'ai téléversé mon récépissé CCP officiel pour la formation UI/UX Design il y a 48 heures. Le paiement apparaît en attente et l'accès aux chapitres 3 et 4 reste bloqué. Merci d'arbitrer et de débloquer mes accès pédagogiques.",
      status: "in_progress",
      priority: "high",
      category: "billing",
      resolution: "Dossier pris en charge par le service financier. Le récépissé a été transmis au bureau de poste pour authentification du cachet humide et vérification du crédit sur le compte de l'institut.",
      created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    },
    {
      user_id: 72,
      subject: "Litige d'examen final : note validée (82%) mais certificat non délivré",
      description: "J'ai obtenu 82% à l'examen final de certification en Comptabilité & Fiscalité (seuil requis : 70%), mais la plateforme affiche une anomalie technique et le certificat avec code d'authentification unique n'apparaît pas dans mon espace.",
      status: "in_progress",
      priority: "high",
      category: "course",
      resolution: "En cours de vérification avec le support technique et le Dr. Meziani. Re-génération du PDF avec le template institutionnel officiel en cours.",
      created_at: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
    },
    {
      user_id: 73,
      subject: "Impossibilité de charger les vidéos en haute définition depuis l'application",
      description: "Sur le module 2 de la formation E-Commerce, les vidéos 1080p se coupent fréquemment en 4G Mobilis. Serait-il possible de proposer un sélecteur de résolution 720p ou 480p pour les connexions à débit réduit ?",
      status: "open",
      priority: "medium",
      category: "technical",
      resolution: null,
      created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    },
    {
      user_id: 75,
      subject: "Litige sur le calcul de la commission et du versement mensuel de novembre",
      description: "Suite à l'arbitrage des 5 dernières ventes de mon cours, le taux de commission appliqué est de 60/40 au lieu du contrat conventionné à 70/30 pour les formatrices accréditées. Je demande la révision du solde avant émission du virement CCP.",
      status: "open",
      priority: "urgent",
      category: "billing",
      resolution: null,
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    },
    {
      user_id: 77,
      subject: "Transfert d'inscription vers le Centre Régional de Constantine",
      description: "Inscrite initialement en ligne, je souhaite basculer vers les ateliers pratiques en présentiel au centre de formation de Constantine à partir du 20 novembre.",
      status: "in_progress",
      priority: "low",
      category: "course",
      resolution: "Dossier transmis au directeur pédagogique du centre de Constantine. Vérification de la capacité d'accueil de la salle et des places restantes.",
      created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    },
    {
      user_id: 68,
      subject: "Litige réglé : Remboursement accordé suite à annulation de session présentielle",
      description: "Demande de remboursement suite au report de la session présentielle d'Alger. Récépissé de virement transmis.",
      status: "resolved",
      priority: "urgent",
      category: "billing",
      resolution: "Remboursement de 7 500 DZD effectué par virement CCP sous la référence CCP-ARB-2026-90412. Dossier clôturé avec accusé de réception de l'apprenant.",
      created_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
      resolved_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    },
    {
      user_id: 70,
      subject: "Rectification de l'orthographe du nom sur le certificat officiel",
      description: "Mon nom de famille comporte une coquille sur le certificat numérique ('Ben Ali' au lieu de 'Benali'). Merci de réémettre le document officiel.",
      status: "resolved",
      priority: "medium",
      category: "account",
      resolution: "Identité corrigée dans le registre national de diplomation. Le nouveau certificat authentifié #CERT-DZ-2026-8812 a été généré et déposé dans votre espace étudiante.",
      created_at: new Date(Date.now() - 96 * 3600 * 1000).toISOString(),
      resolved_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    }
  ];

  console.log(`Inserting ${ticketsToInsert.length} institutional tickets...`);

  for (const t of ticketsToInsert) {
    await pool.query(`
      INSERT INTO tickets (
        user_id, subject, description, status, priority, category, resolution, created_at, updated_at, resolved_at
      ) VALUES (
        $1, $2, $3, $4::ticket_status, $5::ticket_priority, $6::ticket_category, $7, $8, NOW(), $9
      );
    `, [
      t.user_id,
      t.subject,
      t.description,
      t.status,
      t.priority,
      t.category,
      t.resolution,
      t.created_at,
      t.resolved_at || null
    ]);
  }

  const allTickets = await pool.query(`
    SELECT t.id, t.subject, t.status, t.priority, t.category, u.name as user_name
    FROM tickets t
    JOIN users u ON t.user_id = u.id
    ORDER BY t.id DESC;
  `);

  console.log('Total tickets now:', allTickets.rows.length);
  console.log(allTickets.rows);

  await pool.end();
}

main().catch(console.error);
