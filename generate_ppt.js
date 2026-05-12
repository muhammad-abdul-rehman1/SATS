const pptxgen = require('pptxgenjs');

let pptx = new pptxgen();
pptx.layout = 'LAYOUT_16x9';

// Slide 1: Title
let slide1 = pptx.addSlide();
slide1.addText('Smart Asset Tracking System (SATS)', { x: 1, y: 1.5, w: 8, h: 1, fontSize: 36, bold: true, align: 'center', color: '003366' });
slide1.addText('A Beginner\'s Guide to the Code', { x: 1, y: 2.5, w: 8, h: 1, fontSize: 24, align: 'center', color: '666666' });
slide1.addText('Understanding the Backend, Web, and Mobile Applications', { x: 1, y: 3.2, w: 8, h: 0.5, fontSize: 16, align: 'center', color: '999999' });

// Slide 2: What is SATS?
let slide2 = pptx.addSlide();
slide2.addText('What is SATS?', { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 28, bold: true, color: '003366' });
slide2.addText(
  [
    { text: '• SATS stands for Smart Asset Tracking System.\n', options: { fontSize: 20 } },
    { text: '• It helps organizations keep track of their assets (like computers, furniture, etc.).\n', options: { fontSize: 20 } },
    { text: '• It is divided into three main codebases:\n', options: { fontSize: 20 } },
    { text: '   1. Backend (The Brain & Database)\n', options: { fontSize: 18, color: '333333' } },
    { text: '   2. Web Application (The Admin Dashboard)\n', options: { fontSize: 18, color: '333333' } },
    { text: '   3. Mobile Application (The On-The-Go Scanner)', options: { fontSize: 18, color: '333333' } }
  ],
  { x: 0.5, y: 1.2, w: 9, h: 3.5, bullet: false }
);

// Slide 3: Overall Architecture
let slide3 = pptx.addSlide();
slide3.addText('Overall Architecture', { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 28, bold: true, color: '003366' });

slide3.addText('Mobile App\n(React Native/Expo)\n\nScans & Updates', { x: 1, y: 1.5, w: 2.5, h: 2, fill: '4F81BD', align: 'center', color: 'FFFFFF', fontSize: 16 });

slide3.addText('Backend API\n(Node.js/Express)\n\nData Processing', { x: 4, y: 2, w: 2.5, h: 2, fill: '9BBB59', align: 'center', color: 'FFFFFF', fontSize: 16 });

slide3.addText('Web App\n(Next.js/React)\n\nAdmin Control', { x: 7, y: 1.5, w: 2.5, h: 2, fill: '8064A2', align: 'center', color: 'FFFFFF', fontSize: 16 });

slide3.addText('Database', { x: 4.25, y: 5.5, w: 2, h: 1, fill: 'F79646', align: 'center', color: 'FFFFFF', fontSize: 18, bold: true });

// Slide 4: The Backend Code
let slide4 = pptx.addSlide();
slide4.addText('1. The Backend Code', { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 28, bold: true, color: '003366' });
slide4.addText(
  [
    { text: 'Folder: SAT-backend-main\n', options: { fontSize: 20, bold: true } },
    { text: 'Technology: Node.js & Express.js\n\n', options: { fontSize: 18, color: '666666' } },
    { text: 'What it does:\n', options: { fontSize: 20 } },
    { text: '• Acts as the central server that handles all requests.\n', options: { fontSize: 18 } },
    { text: '• Connects to the database to save and retrieve asset data.\n', options: { fontSize: 18 } },
    { text: '• Enforces rules (e.g., Only admins can delete assets).\n\n', options: { fontSize: 18 } },
    { text: 'Important Folders:\n', options: { fontSize: 20 } },
    { text: '• src/routes: Defines the URLs (like /api/assets).\n', options: { fontSize: 18 } },
    { text: '• src/controllers: The logic (what happens when a URL is visited).\n', options: { fontSize: 18 } },
    { text: '• src/models: The shape of the data in the database.\n', options: { fontSize: 18 } }
  ],
  { x: 0.5, y: 1.2, w: 9, h: 4, bullet: false }
);

// Slide 5: The Web Application Code
let slide5 = pptx.addSlide();
slide5.addText('2. The Web Application Code', { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 28, bold: true, color: '003366' });
slide5.addText(
  [
    { text: 'Folder: SATS-webapp-main\n', options: { fontSize: 20, bold: true } },
    { text: 'Technology: Next.js, React, Tailwind CSS\n\n', options: { fontSize: 18, color: '666666' } },
    { text: 'What it does:\n', options: { fontSize: 20 } },
    { text: '• Provides a website for administrators to manage the system.\n', options: { fontSize: 18 } },
    { text: '• Displays dashboards, charts, and lists of assets and rooms.\n\n', options: { fontSize: 18 } },
    { text: 'Important Folders & Files:\n', options: { fontSize: 20 } },
    { text: '• src/app or src/pages: Contains the different web pages (Home, Assets, Rooms).\n', options: { fontSize: 18 } },
    { text: '• src/components: Reusable UI parts like buttons and tables.\n', options: { fontSize: 18 } },
    { text: '• tailwind.config.js: Controls the styling and colors.\n', options: { fontSize: 18 } }
  ],
  { x: 0.5, y: 1.2, w: 9, h: 4, bullet: false }
);

// Slide 6: The Mobile Application Code
let slide6 = pptx.addSlide();
slide6.addText('3. The Mobile Application Code', { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 28, bold: true, color: '003366' });
slide6.addText(
  [
    { text: 'Folder: SATS-frontend-main\n', options: { fontSize: 20, bold: true } },
    { text: 'Technology: React Native & Expo\n\n', options: { fontSize: 18, color: '666666' } },
    { text: 'What it does:\n', options: { fontSize: 20 } },
    { text: '• An app installed on phones for staff working on the go.\n', options: { fontSize: 18 } },
    { text: '• Likely uses the camera to scan QR codes or barcodes of assets.\n\n', options: { fontSize: 18 } },
    { text: 'Important Folders & Files:\n', options: { fontSize: 20 } },
    { text: '• app/: The screens of the app (like Login, Scan, Profile).\n', options: { fontSize: 18 } },
    { text: '• components/: Reusable visual elements.\n', options: { fontSize: 18 } },
    { text: '• services/: Code that talks to the Backend API over the internet.\n', options: { fontSize: 18 } }
  ],
  { x: 0.5, y: 1.2, w: 9, h: 4, bullet: false }
);

// Slide 7: How They Talk to Each Other
let slide7 = pptx.addSlide();
slide7.addText('How They Talk to Each Other', { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 28, bold: true, color: '003366' });
slide7.addText(
  [
    { text: 'The magic happens through APIs (Application Programming Interfaces).\n', options: { fontSize: 20 } },
    { text: '1. User Action: Admin clicks "Add Asset" on the Web App.\n', options: { fontSize: 18 } },
    { text: '2. Request: The Web App sends a message over the internet to the Backend.\n', options: { fontSize: 18 } },
    { text: '3. Processing: The Backend receives it, checks permissions, and saves it in the Database.\n', options: { fontSize: 18 } },
    { text: '4. Response: The Backend replies "Success!" to the Web App.\n', options: { fontSize: 18 } },
    { text: '5. Display: The Web App shows the new asset in the list.\n', options: { fontSize: 18 } }
  ],
  { x: 0.5, y: 1.2, w: 9, h: 3, bullet: false }
);

// Slide 8: Summary
let slide8 = pptx.addSlide();
slide8.addText('Summary', { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 28, bold: true, color: '003366' });
slide8.addText(
  [
    { text: '• SATS is a full-stack project.\n', options: { fontSize: 22, bold: true } },
    { text: '• Backend = The engine and data storage.\n', options: { fontSize: 20 } },
    { text: '• Web App = The dashboard for administrators.\n', options: { fontSize: 20 } },
    { text: '• Mobile App = The scanning tool for on-the-ground staff.\n\n', options: { fontSize: 20 } },
    { text: 'By understanding these three pieces, you can understand the whole codebase!', options: { fontSize: 22, color: '003366', italic: true } }
  ],
  { x: 0.5, y: 1.5, w: 9, h: 3, bullet: true }
);

// Save the Presentation
pptx.writeFile({ fileName: 'SATS_Code_Explanation.pptx' }).then(fileName => {
    console.log(`Created Presentation: ${fileName}`);
}).catch(err => {
    console.error(err);
});
