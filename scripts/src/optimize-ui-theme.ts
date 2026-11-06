import * as fs from "fs";
import * as path from "path";

const PAGES_DIR = path.resolve("c:/Users/ZBOOK/Downloads/tamayuztech/tamayuz/artifacts/smart-training/src/pages");

// Recursively get all .tsx files
function getFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(filePath));
    } else if (filePath.endsWith(".tsx")) {
      results.push(filePath);
    }
  });
  return results;
}

// Perform simple regex replacements to shift style tags to standard classes
function optimizeFile(filePath: string) {
  let content = fs.readFileSync(filePath, "utf8");
  let changed = false;

  // Replacements list
  const replacements: [RegExp, string][] = [
    // Page bg
    [/style=\{\{\s*background:\s*"hsl\(258,45%,8%\)"\s*\}\}/g, 'className="bg-[#fafafa]"'],
    [/style=\{\{\s*background:\s*'hsl\(258,45%,8%\)'\s*\}\}/g, 'className="bg-[#fafafa]"'],
    
    // Card container
    [/style=\{\{\s*background:\s*"hsl\(258,55%,16%\)",\s*border:\s*"1px solid hsl\(258,50%,25%\)"\s*\}\}/g, 'className="bg-white border border-border shadow-sm rounded-2xl"'],
    [/style=\{\{\s*background:\s*"hsl\(258,55%,16%\)",\s*border:\s*`1px solid \$\{showActions\s*\?\s*"[^"]+"\s*:\s*"[^"]+"\s*\}`\s*\}\}/g, 'className="bg-white border border-border shadow-sm rounded-2xl"'],
    [/style=\{\{\s*background:\s*"hsl\(258,55%,16%\)",\s*border:\s*"1px solid hsl\(258,50%,30%\)"\s*\}\}/g, 'className="bg-white border border-border shadow-sm rounded-2xl"'],
    [/style=\{\{\s*background:\s*"hsl\(258,60%,18%\)",\s*border:\s*"1px solid hsl\(258,50%,30%\)"\s*\}\}/g, 'className="bg-white border border-border shadow-sm rounded-2xl"'],
    [/style=\{\{\s*background:\s*"hsl\(258,50%,18%\)"\s*\}\}/g, 'className="bg-muted shadow-2xs rounded-2xl"'],
    
    // Inline purple button styles
    [/style=\{\{\s*background:\s*"hsl\(258,75%,55%\)"\s*\}\}/g, 'className="bg-black hover:bg-black/90 text-white font-bold shadow-sm border border-black"'],
    [/style=\{\{\s*background:\s*"linear-gradient\(135deg, hsl\(258,75%,55%\), hsl\(270,70%,55%\)\)",\s*color:\s*"white"\s*\}\}/g, 'className="bg-black hover:bg-black/90 text-white font-bold shadow-sm"'],
    [/style=\{\{\s*background:\s*"linear-gradient\(135deg,\s*hsl\(258,75%,55%\),\s*hsl\(270,70%,55%\)\)"\s*\}\}/g, 'className="bg-black hover:bg-black/90 text-white font-bold shadow-sm"'],
    
    // Hardcoded translucencies in dark theme converted to light theme counterparts
    [/style=\{\{\s*background:\s*"rgba\(255,255,255,0.05\)"\s*\}\}/g, 'className="bg-muted/80 border border-border"'],
    [/style=\{\{\s*background:\s*"rgba\(255,255,255,0.06\)"\s*\}\}/g, 'className="bg-muted border border-border"'],
    [/style=\{\{\s*background:\s*"rgba\(255,255,255,0.1\)",\s*border:\s*"1px solid rgba\(255,255,255,0.15\)"\s*\}\}/g, 'className="bg-muted border border-border"'],
    
    // Text colors (white text to foreground text)
    [/className="text-white"/g, 'className="text-foreground"'],
    [/className="text-white\b/g, 'className="text-foreground'],
    [/className="text-white\/80"/g, 'className="text-muted-foreground"'],
    [/className="text-white\/70"/g, 'className="text-muted-foreground/90"'],
    [/className="text-white\/60"/g, 'className="text-muted-foreground/80"'],
    [/className="text-white\/50"/g, 'className="text-muted-foreground/70"'],
    [/className="text-white\/40"/g, 'className="text-muted-foreground/50"'],
    [/className="text-white\/30"/g, 'className="text-muted-foreground/40"'],
    [/className="text-white\/20"/g, 'className="text-muted-foreground/30"'],
    [/className="text-white\/10"/g, 'className="text-muted-foreground/20"'],
    
    // Border colors
    [/style=\{\{\s*borderColor:\s*"rgba\(255,255,255,0.1\)"\s*\}\}/g, 'className="border-border"'],
  ];

  replacements.forEach(([pattern, repl]) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, repl);
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`Optimized UI: ${path.basename(filePath)}`);
  }
}

function run() {
  console.log("Scanning files for style optimization...");
  const files = getFiles(PAGES_DIR);
  files.forEach(optimizeFile);
  console.log("Style optimization completed!");
}

run();
