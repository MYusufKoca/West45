require('dotenv').config();

const pool = require('./pool');

const projects = [
  {
    title: 'RL FENNEC',
    tag: 'CAMPAIGN / PHOTOGRAPHY',
    category: 'web',
    categoryLabelTr: 'WEB TASARIM',
    categoryLabelEn: 'WEB DESIGN',
    descriptionTr: 'RL Fennec markası için uçtan uca web tasarım ve deneyim çalışması. Görsel kimlik, tipografi ve arayüz bileşenleri sıfırdan tasarlandı.',
    descriptionEn: 'An end-to-end web design and experience project for the RL Fennec brand — visual identity, typography and interface components built from scratch.',
    imageUrl: 'assets/images/project-01.jpg',
    imageAlt: 'NOIR — Campaign / Photography',
    link: null,
    layout: 'wide',
    displayOrder: 1,
  },
  {
    title: 'RL CARS',
    tag: 'BRANDING / ART DIRECTION',
    category: 'branding',
    categoryLabelTr: 'MARKA KİMLİĞİ',
    categoryLabelEn: 'BRANDING',
    descriptionTr: 'RL Cars için marka kimliği ve sanat yönetmenliği projesi. Logo, renk sistemi ve görsel dil bu çalışma kapsamında oluşturuldu.',
    descriptionEn: 'A branding and art direction project for RL Cars — logo, colour system and visual language developed as part of this engagement.',
    imageUrl: 'assets/images/project-02.jpg',
    imageAlt: 'WEST OBJECTS — Branding / Art Direction',
    link: null,
    layout: 'tall',
    displayOrder: 2,
  },
  {
    title: 'GIF TEST',
    tag: 'EDITORIAL / FILM',
    category: 'social',
    categoryLabelTr: 'SOSYAL MEDYA',
    categoryLabelEn: 'SOCIAL MEDIA',
    descriptionTr: 'Sosyal medya için hareketli içerik ve GIF formatlı kampanya testleri. Kısa, dikkat çekici animasyon dili üzerine odaklanıldı.',
    descriptionEn: 'Motion content and GIF-format campaign tests for social media, focused on a short, attention-grabbing animation language.',
    imageUrl: 'assets/images/project-03.gif',
    imageAlt: 'AFTER DARK — Editorial / Film',
    link: null,
    layout: 'tall',
    displayOrder: 3,
  },
  {
    title: 'RL BMW',
    tag: 'DIGITAL / FILM',
    category: 'web',
    categoryLabelTr: 'WEB TASARIM',
    categoryLabelEn: 'WEB DESIGN',
    descriptionTr: 'RL BMW için dijital deneyim ve film odaklı web projesi. Sayfa geçişleri ve görsel anlatım öne çıkan unsurlar oldu.',
    descriptionEn: 'A digital experience and film-driven web project for RL BMW, with page transitions and visual storytelling as the key focus.',
    imageUrl: 'assets/images/project-04.jpg',
    imageAlt: 'WEST MOTION — Digital / Film',
    link: null,
    layout: 'wide',
    displayOrder: 4,
  },
];

const services = [
  { nameTr: 'Sosyal Medya Yönetimi', nameEn: 'Social Media Management', previewImageUrl: 'assets/images/service-creative-direction.jpg', displayOrder: 1 },
  { nameTr: 'Fotograf', nameEn: 'Photography', previewImageUrl: 'assets/images/service-photography.jpg', displayOrder: 2 },
  { nameTr: 'Web Tasarım', nameEn: 'Web Design', previewImageUrl: 'assets/images/service-web-design.jpg', displayOrder: 3 },
  { nameTr: 'Web Geliştirme', nameEn: 'Web Development', previewImageUrl: 'assets/images/service-branding.jpg', displayOrder: 4 },
  { nameTr: 'SAHA ÇEKİMİ', nameEn: 'ON-LOCATION SHOOTS', previewImageUrl: 'assets/images/service-film.jpg', displayOrder: 5 },
];

async function upsertProject(client, project) {
  const values = [
    project.title, project.tag, project.category, project.categoryLabelTr, project.categoryLabelEn,
    project.descriptionTr, project.descriptionEn, project.imageUrl, project.imageAlt, project.link,
    project.layout, project.displayOrder,
  ];
  const existing = await client.query('SELECT id FROM projects WHERE title = $1', [project.title]);

  if (existing.rowCount === 0) {
    await client.query(`INSERT INTO projects (
      title, tag, category, category_label_tr, category_label_en, description_tr, description_en,
      image_url, image_alt, link, layout, display_order
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, values);
    return;
  }

  await client.query(`UPDATE projects SET
    tag = $2, category = $3, category_label_tr = $4, category_label_en = $5,
    description_tr = $6, description_en = $7, image_url = $8, image_alt = $9,
    link = $10, layout = $11, display_order = $12, updated_at = CURRENT_TIMESTAMP
    WHERE title = $1`, values);
}

async function upsertService(client, service) {
  const values = [service.nameTr, service.nameEn, service.previewImageUrl, service.displayOrder];
  const existing = await client.query('SELECT id FROM services WHERE name_en = $1', [service.nameEn]);

  if (existing.rowCount === 0) {
    await client.query(
      'INSERT INTO services (name_tr, name_en, preview_image_url, display_order) VALUES ($1, $2, $3, $4)',
      values
    );
    return;
  }

  await client.query(`UPDATE services SET
    name_tr = $1, preview_image_url = $3, display_order = $4, updated_at = CURRENT_TIMESTAMP
    WHERE name_en = $2`, values);
}

async function seed() {
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');
    for (const project of projects) await upsertProject(client, project);
    for (const service of services) await upsertService(client, service);
    await client.query('COMMIT');
    console.log(`Database seed completed successfully: ${projects.length} projects, ${services.length} services.`);
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Database seed failed:', error.message || error.code || error.name);
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

seed();
