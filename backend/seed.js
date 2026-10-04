require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { query, withTransaction, connectDB, closeDB } = require('./config/db');

const upload = (slug) => ({
  videoUrl: `http://localhost:5000/uploads/${slug}.mp4`,
  thumbnailUrl: `http://localhost:5000/uploads/${slug}.jpg`,
  sourceVideoName: `${slug}.mp4`,
});

async function seed() {
  await connectDB();
  await withTransaction(async (client) => {
    await client.query('TRUNCATE notifications, shares, comments, likes, saves, login_history, ideas, users CASCADE');

    const adminId = crypto.randomUUID();
    const studentId = crypto.randomUUID();
    const adminPassword = await bcrypt.hash('Admin@123', 12);
    const studentPassword = await bcrypt.hash('demo1234', 12);

    await client.query(`
      INSERT INTO users (
        id,name,username,email,password_hash,college_name,student_id,institution_email,
        verification_status,role,skills,verified_at
      ) VALUES
      ($1,'IdeaHub Admin','admin','admin@ideahub.local',$3,'IdeaHub College','ADMIN-001','admin@ideahub.local','verified','admin',ARRAY['Moderation','Community'],NOW()),
      ($2,'Ranjan Kumar','ranjan.ai','demo@ideahub.local',$4,'Demo Engineering College','DEMO-001','ranjan@demo.edu','verified','user',ARRAY['AI / ML','Computer Vision','Prototyping'],NOW())
    `, [adminId, studentId, adminPassword, studentPassword]);

    const ideas = [
      ['idea','AI Attendance with Face Recognition','A 35-second demo of an attendance prototype using face embeddings and a registered student dataset.','AI / ML','Working Prototype', ['Python','OpenCV','FaceNet'], ['#AI','#OpenCV','#Attendance'], 'demo-ai-attendance',35,1280,126,3,22,18],
      ['idea','Smart Dustbin using Arduino','An ultrasonic sensor detects a nearby user and a servo opens the lid automatically.','IoT','Prototype', ['Arduino','Ultrasonic Sensor','Servo'], ['#Arduino','#IoT','#Prototype'], 'demo-smart-dustbin',40,980,87,4,14,9],
      ['idea','CyberSafe QR Scam Pre-Scanner','A mobile-first concept that checks a QR destination before a payment or link is opened.','Cyber Security','Building', ['Kotlin','Firebase','Python'], ['#CyberSecurity','#QR','#Android'], 'demo-cybersafe',50,1540,153,8,31,24],
      ['idea','Gesture-Controlled Presentation','A computer-vision experiment that lets a presenter change slides with simple hand gestures.','Computer Vision','Working Prototype', ['Python','MediaPipe','OpenCV'], ['#ComputerVision','#Python','#MediaPipe'], 'demo-gesture',55,1130,99,5,19,12],
      ['reel','CyberSafe QR: Scam Check in 45 Seconds','A fast vertical walkthrough of how a security prototype checks a suspicious QR destination before opening it.','Cyber Security','Building', ['Kotlin','Firebase','Python'], ['#CyberSecurity','#QR','#Reels'], 'demo-cybersafe',45,2100,212,2,38,35],
      ['reel','Gesture Control: Live Prototype Demo','A vertical demo showing a presentation changing slides using simple hand gestures.','Computer Vision','Working Prototype', ['Python','MediaPipe','OpenCV'], ['#ComputerVision','#MediaPipe','#Demo'], 'demo-gesture',52,1780,176,1,29,28],
    ];

    const created = [];
    for (const [contentType,title,description,category,projectStatus,technologies,tags,slug,duration,views,likesCount,commentsCount,savesCount,sharesCount] of ideas) {
      const id = crypto.randomUUID();
      const media = upload(slug);
      await client.query(`
        INSERT INTO ideas (
          id,content_type,title,description,category,project_status,technologies,tags,
          video_url,thumbnail_url,duration,source_video_name,creator_id,
          views,likes_count,comments_count,saves_count,shares_count,moderation_status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'approved')
      `, [id,contentType,title,description,category,projectStatus,technologies,tags,media.videoUrl,media.thumbnailUrl,duration,media.sourceVideoName,studentId,views,likesCount,commentsCount,savesCount,sharesCount]);
      created.push({ id, title, contentType });
    }

    const first = created[0];
    const second = created[1];
    const firstReel = created[4];

    // Real relational demo activity so the like/save/comment/share UI can be tested immediately.
    await client.query('INSERT INTO likes (id, idea_id, user_id) VALUES ($1,$2,$3)', [crypto.randomUUID(), first.id, adminId]);
    await client.query('INSERT INTO saves (id, idea_id, user_id) VALUES ($1,$2,$3)', [crypto.randomUUID(), second.id, adminId]);
    await client.query('INSERT INTO shares (id, idea_id, user_id, share_method) VALUES ($1,$2,$3,$4)', [crypto.randomUUID(), firstReel.id, adminId, 'copy']);

    const comments = [
      [first.id, adminId, 'Great prototype. The face-recognition flow is easy to understand.'],
      [first.id, studentId, 'Thanks! Next step is adding liveness checks and better lighting support.'],
      [firstReel.id, adminId, 'This would be useful for a quick security awareness demo.'],
    ];
    for (const [ideaId, userId, text] of comments) {
      await client.query(
        'INSERT INTO comments (id,idea_id,user_id,text) VALUES ($1,$2,$3,$4)',
        [crypto.randomUUID(), ideaId, userId, text]
      );
    }

    await client.query(`
      INSERT INTO login_history (id,user_id,ip_address,user_agent) VALUES
      ($1,$3,'127.0.0.1','IdeaHub demo seed'),
      ($2,$4,'127.0.0.1','IdeaHub demo seed')
    `, [crypto.randomUUID(), crypto.randomUUID(), adminId, studentId]);

    await client.query(
      `INSERT INTO notifications (id,user_id,type,title,message) VALUES ($1,$2,'system','Welcome to IdeaHub','Your demo account is ready. Try an Idea Reel, comments, likes, saves, sharing and the notification bell.')`,
      [crypto.randomUUID(), studentId]
    );

    console.log('PostgreSQL seed complete.');
    console.log('Admin: admin@ideahub.local / Admin@123');
    console.log('Verified demo user: demo@ideahub.local / demo1234');
    console.log(`Seeded ${created.length} approved ideas/reels plus comments, likes, saves and shares.`);
  });
  await closeDB();
}

seed().catch(async (error) => {
  console.error(error);
  try { await closeDB(); } catch {}
  process.exit(1);
});
