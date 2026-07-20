const fs = require('fs');
const path = '/Users/mac/Desktop/forgivenai-commerce/supabase/functions/ugc-generate/index.ts';
let content = fs.readFileSync(path, 'utf8');

const target1 = `6. BRAND PRESENCE: Is the model placed in a luxury environment with "Forgiven Shopping Centre" or "FSC" branding visible? Fail if the image looks like a generic studio without branding.
${"${referencePersonUrl ? `7. IDENTITY MATCH: Compare the generated person's face to the reference person's face (the second image provided). They MUST be the exact same person. Fail if the generated person is a different person, a mannequin, or if the facial features, ethnicity, or skin tone do not match the reference.` : \"\"}"}`;

const replacement1 = `6. BRAND PRESENCE: Is the model placed in a luxury environment? (Note: Exact spelling of logos is NOT required, as long as the environment feels premium and matches the requested studio style).
${"${referencePersonUrl ? `7. IDENTITY MATCH: Compare the generated person's face to the reference person's face (the second image provided). They should look like the same person or a very close lookalike. Fail ONLY if the generated person has a completely different ethnicity, skin tone, gender, or is an obvious mannequin.` : \"\"}"}`;

if (content.includes(target1)) {
  content = content.replace(target1, replacement1);
  console.log("Successfully replaced Target 1");
} else {
  console.log("Target 1 not found!");
}

const target2 = `const mannequins = Array.isArray(data) ? data : (data.mannequins || data.data || []);`;

const replacement2 = `let mannequins = [];
        if (Array.isArray(data)) mannequins = data;
        else if (data && Array.isArray(data.mannequins)) mannequins = data.mannequins;
        else if (data && Array.isArray(data.data)) mannequins = data.data;
        else if (data && typeof data.data === 'object' && data.data !== null) mannequins = Object.values(data.data);
        else if (data && typeof data.mannequins === 'object' && data.mannequins !== null) mannequins = Object.values(data.mannequins);
        else if (data && typeof data === 'object') mannequins = Object.values(data);`;

if (content.includes(target2)) {
  content = content.replace(target2, replacement2);
  console.log("Successfully replaced Target 2");
} else {
  console.log("Target 2 not found!");
}

fs.writeFileSync(path, content, 'utf8');
console.log("File updated successfully.");
