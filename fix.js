const fs = require('fs');
['dashboard/src/app/page.js', 'dashboard/src/app/upload/page.js', 'dashboard/src/app/meeting/[id]/page.js'].forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/\\\`/g, '`').replace(/\\\$/g, '$');
  fs.writeFileSync(f, content);
});
