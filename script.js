/* =====================================================================
   WEST 45 — script.js
   Modüler yapı: her özellik kendi init*() fonksiyonunda izole edilmiş,
   dosya sonunda hepsi sırayla çağrılıyor. Bir feature'ın DOM'da karşılığı
   yoksa ilgili init fonksiyonu güvenli şekilde erken çıkar (if (!el) return),
   böylece bir bölüm eksik olsa bile geri kalan script çökmez.

   Mouse/cursor/parallax sistemi tek bir requestAnimationFrame döngüsünden
   besleniyor: mousemove sırasında doğrudan DOM'a yazılmıyor, sadece hedef
   değerler güncelleniyor; asıl render işi rAF içinde, transform/opacity
   üzerinden yapılıyor (layout thrashing yok).
   ===================================================================== */

(() => {
  'use strict';

  /* -------------------------------------------------------------------
     Ortam tespiti — tüm modüller bunu paylaşır
     ------------------------------------------------------------------- */
  const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (supportsHover) {
    document.documentElement.classList.add('has-cursor');
  }

  const root = document.documentElement;

  /* -------------------------------------------------------------------
     Basit bir dil-değişimi event sistemi.
     Modal gibi dinamik içerik üreten modüller, dil değiştiğinde
     kendi güncel içeriğini yeniden çevirebilmek için buna abone olur.
     ------------------------------------------------------------------- */
  const LANG_CHANGE_EVENT = 'west45:langchange';

  /* -------------------------------------------------------------------
     CONFIG — public API adresi tek noktadan yönetilir. Bu değer secret
     değildir; production backend adresi kesinleştiğinde yalnızca burada
     güncellenecektir.
     ------------------------------------------------------------------- */
  const CONFIG = {
    API_BASE_URL: 'https://west45.onrender.com',
  };

  /* -------------------------------------------------------------------
     PROJECTS + SERVICES — public API'den yüklenen merkezi state. Statik
     fallback yoktur; başarısızlıkta kullanıcıya minimal error state gösterilir.
     ------------------------------------------------------------------- */
  let projects = [];
  let services = [];

  async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
      ...options,
      headers: { Accept: 'application/json', ...options.headers },
    });
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const body = response.status === 204 ? null : isJson ? await response.json().catch(() => null) : null;

    if (!response.ok) {
      const error = new Error('API request failed');
      error.status = response.status;
      error.details = body?.details;
      throw error;
    }

    return body;
  }

  function resolveAssetUrl(url) {
    if (typeof url !== 'string' || !url) return '';
    return /^(https?:)?\/\//i.test(url) ? url : url;
  }

  /* -------------------------------------------------------------------
     Scroll lock — mobil menü ve modal aynı yardımcı class'ı paylaşır.
     Referans sayacı kullanılır: ikisi aynı anda açık olursa bile
     biri kapanınca scroll'un erken açılmasını engeller.
     ------------------------------------------------------------------- */
  let scrollLockCount = 0;

  function lockScroll() {
    scrollLockCount += 1;
    document.body.classList.add('no-scroll');
  }

  function unlockScroll() {
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount === 0) {
      document.body.classList.remove('no-scroll');
    }
  }

  /* =====================================================================
     TEMA (light / dark)
     <head> içindeki inline script CSS yüklenmeden önce data-theme'i zaten
     ayarlıyor (flash önleme). Burada mevcut durumu okuyup toggle'a bağlanıyoruz.
     ===================================================================== */
  function initTheme() {
    const THEME_KEY = 'west45-theme';
    const themeToggle = document.getElementById('themeToggle');

    function getPreferredTheme() {
      try {
        const stored = localStorage.getItem(THEME_KEY);
        if (stored === 'light' || stored === 'dark') return stored;
      } catch (e) { /* localStorage erişilemiyorsa sessizce devam et */ }
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }

    function applyTheme(theme) {
      root.setAttribute('data-theme', theme);
      if (themeToggle) themeToggle.setAttribute('aria-pressed', String(theme === 'light'));
    }

    let currentTheme = root.getAttribute('data-theme') || getPreferredTheme();
    applyTheme(currentTheme);

    if (!themeToggle) return;

    themeToggle.addEventListener('click', () => {
      currentTheme = currentTheme === 'light' ? 'dark' : 'light';
      applyTheme(currentTheme);
      try { localStorage.setItem(THEME_KEY, currentTheme); } catch (e) { /* yoksay */ }
    });
  }

  /* =====================================================================
     DİL (TR / EN)
     [data-i18n] → textContent (veya [data-i18n-html] varsa innerHTML,
     yalnızca aşağıdaki sabit çeviri sözlüğünden gelen, kullanıcı girdisi
     içermeyen değerler için kullanılıyor).
     [data-i18n-aria] → aria-label.
     ===================================================================== */
  const translations = {
    tr: {
      'logo.ariaLabel': 'WEST 45 — anasayfa',
      'nav.toggleLabel': 'Menüyü aç',
      'lang.groupLabel': 'Dil seçimi',
      'theme.toggleLabel': 'Tema değiştir',
      'nav.home': 'ANASAYFA',
      'nav.work': 'ÇALIŞMALARIMIZ',
      'nav.services': 'HİZMETLERİMİZ',
      'nav.about': 'HAKKIMIZDA',
      'nav.contact': 'İLETİŞİM',
      'hero.line1': 'WE CREATE',
      'hero.line2': 'VISUAL',
      'hero.line3': 'IMPACT.',
      'hero.tag1': 'CREATIVE STUDIO',
      'work.eyebrow': '01 — PROJELERİMİZ',
      'work.title': 'ÇALIŞMALARIMIZ',
      'filter.groupLabel': 'Proje filtrele',
      'filter.all': 'TÜMÜ',
      'filter.web': 'WEB',
      'filter.branding': 'MARKA',
      'filter.social': 'SOSYAL',
      'content.loading': 'İçerik yükleniyor…',
      'content.projectsUnavailable': 'Projeler şu anda yüklenemedi.',
      'content.servicesUnavailable': 'Hizmetler şu anda yüklenemedi.',
      'services.eyebrow': '02 — BİZ NE YAPARIZ',
      'services.title': 'HİZMETLERİMİZ',
      'services.item1': 'Sosyal Medya Yönetimi',
      'services.item2': 'Fotograf',
      'services.item3': 'Web Tasarım',
      'services.item4': 'Web Geliştirme',
      'services.item5': 'SAHA ÇEKİMİ',
      'about.eyebrow': '03 — WEST 45 NEDİR',
      'about.title': 'KISITLAMALARIN<br>DIŞINA ÇIK.',
      'contact.title': 'BİZİMLE ÇALIŞMAK<br>İSTER MİSİNİZ.',
      'modal.close': 'Kapat',
      'modal.viewProject': 'Projeyi Görüntüle →',
      'project1.categoryLabel': 'WEB TASARIM',
      'project1.description': 'RL Fennec markası için uçtan uca web tasarım ve deneyim çalışması. Görsel kimlik, tipografi ve arayüz bileşenleri sıfırdan tasarlandı.',
      'project2.categoryLabel': 'MARKA KİMLİĞİ',
      'project2.description': 'RL Cars için marka kimliği ve sanat yönetmenliği projesi. Logo, renk sistemi ve görsel dil bu çalışma kapsamında oluşturuldu.',
      'project3.categoryLabel': 'SOSYAL MEDYA',
      'project3.description': 'Sosyal medya için hareketli içerik ve GIF formatlı kampanya testleri. Kısa, dikkat çekici animasyon dili üzerine odaklanıldı.',
      'project4.categoryLabel': 'WEB TASARIM',
      'project4.description': 'RL BMW için dijital deneyim ve film odaklı web projesi. Sayfa geçişleri ve görsel anlatım öne çıkan unsurlar oldu.',
      'form.name.label': 'İsim',
      'form.email.label': 'E-posta',
      'form.company.label': 'Şirket',
      'form.optional': '(opsiyonel)',
      'form.service.label': 'Hizmet',
      'form.service.placeholder': 'Seçiniz',
      'form.service.webDesign': 'Web Tasarım',
      'form.service.branding': 'Marka Kimliği',
      'form.service.socialMedia': 'Sosyal Medya',
      'form.service.other': 'Diğer',
      'form.message.label': 'Mesaj',
      'form.submit': 'Gönder',
      'form.error.required': 'Bu alan zorunludur.',
      'form.error.email': 'Geçerli bir e-posta adresi girin.',
      'form.error.minLength': 'En az {min} karakter girin.',
      'form.error.maxLength': 'En fazla {max} karakter girin.',
      'form.status.success': 'Mesajınız alındı. En kısa sürede sizinle iletişime geçeceğiz.',
      'form.status.error': 'Lütfen işaretli alanları kontrol edin.',
      'form.status.validation': 'Lütfen formdaki bilgileri kontrol edin.',
      'form.status.rateLimit': 'Çok fazla istek gönderdiniz. Lütfen biraz sonra tekrar deneyin.',
      'form.status.network': 'Şu anda bağlantı kurulamadı. Lütfen daha sonra tekrar deneyin.',
      'form.status.server': 'Mesajınız şu anda gönderilemedi. Lütfen daha sonra tekrar deneyin.',
    },
    en: {
      'logo.ariaLabel': 'WEST 45 — homepage',
      'nav.toggleLabel': 'Open menu',
      'lang.groupLabel': 'Language selection',
      'theme.toggleLabel': 'Toggle theme',
      'nav.home': 'HOME',
      'nav.work': 'WORK',
      'nav.services': 'SERVICES',
      'nav.about': 'ABOUT',
      'nav.contact': 'CONTACT',
      'hero.line1': 'WE CREATE',
      'hero.line2': 'VISUAL',
      'hero.line3': 'IMPACT.',
      'hero.tag1': 'CREATIVE STUDIO',
      'work.eyebrow': '01 — SELECTED WORK',
      'work.title': 'SELECTED<br>PROJECTS.',
      'filter.groupLabel': 'Filter projects',
      'filter.all': 'ALL',
      'filter.web': 'WEB',
      'filter.branding': 'BRANDING',
      'filter.social': 'SOCIAL',
      'content.loading': 'Loading content…',
      'content.projectsUnavailable': 'Projects could not be loaded right now.',
      'content.servicesUnavailable': 'Services could not be loaded right now.',
      'services.eyebrow': '02 — WHAT WE DO',
      'services.title': 'OUR<br>CRAFT.',
      'services.item1': 'Social Media Management',
      'services.item2': 'Photography',
      'services.item3': 'Web Design',
      'services.item4': 'Web Development',
      'services.item5': 'ON-LOCATION SHOOTS',
      'about.eyebrow': '03 — ABOUT WEST 45',
      'about.title': "WE DON'T FOLLOW<br>THE FRAME.",
      'contact.title': "LET'S MAKE<br>SOMETHING.",
      'modal.close': 'Close',
      'modal.viewProject': 'View Project →',
      'project1.categoryLabel': 'WEB DESIGN',
      'project1.description': 'An end-to-end web design and experience project for the RL Fennec brand — visual identity, typography and interface components built from scratch.',
      'project2.categoryLabel': 'BRANDING',
      'project2.description': 'A branding and art direction project for RL Cars — logo, colour system and visual language developed as part of this engagement.',
      'project3.categoryLabel': 'SOCIAL MEDIA',
      'project3.description': 'Motion content and GIF-format campaign tests for social media, focused on a short, attention-grabbing animation language.',
      'project4.categoryLabel': 'WEB DESIGN',
      'project4.description': 'A digital experience and film-driven web project for RL BMW, with page transitions and visual storytelling as the key focus.',
      'form.name.label': 'Name',
      'form.email.label': 'Email',
      'form.company.label': 'Company',
      'form.optional': '(optional)',
      'form.service.label': 'Service',
      'form.service.placeholder': 'Select an option',
      'form.service.webDesign': 'Web Design',
      'form.service.branding': 'Branding',
      'form.service.socialMedia': 'Social Media',
      'form.service.other': 'Other',
      'form.message.label': 'Message',
      'form.submit': 'Send',
      'form.error.required': 'This field is required.',
      'form.error.email': 'Enter a valid email address.',
      'form.error.minLength': 'Enter at least {min} characters.',
      'form.error.maxLength': 'Enter no more than {max} characters.',
      'form.status.success': 'Your message has been received. We\'ll get back to you soon.',
      'form.status.error': 'Please check the highlighted fields.',
      'form.status.validation': 'Please check the form details.',
      'form.status.rateLimit': 'Too many requests. Please try again later.',
      'form.status.network': 'A connection could not be made. Please try again later.',
      'form.status.server': 'Your message could not be sent right now. Please try again later.',
    },
  };

  let currentLang = 'tr';

  function t(key, vars) {
    const dict = translations[currentLang] || translations.tr;
    let value = dict[key];
    if (value === undefined) return '';
    if (vars) {
      Object.keys(vars).forEach((v) => {
        value = value.replace(`{${v}}`, vars[v]);
      });
    }
    return value;
  }

  document.addEventListener(LANG_CHANGE_EVENT, () => {
    if (!services.length) return;
    renderServices();
    initScrollReveal();
    initServicePreview();
  });

  function initLanguage() {
    const LANG_KEY = 'west45-lang';
    const langButtons = document.querySelectorAll('.lang-btn');

    function applyLanguage(lang) {
      if (!translations[lang]) return;
      currentLang = lang;
      root.setAttribute('lang', lang);

      document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        const value = t(key);
        if (!value) return;
        if (el.hasAttribute('data-i18n-html')) {
          el.innerHTML = value;
        } else {
          el.textContent = value;
        }
      });

      document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
        const key = el.getAttribute('data-i18n-aria');
        const value = t(key);
        if (value) el.setAttribute('aria-label', value);
      });

      langButtons.forEach((btn) => {
        const isActive = btn.dataset.lang === lang;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
      });

      document.dispatchEvent(new CustomEvent(LANG_CHANGE_EVENT, { detail: { lang } }));
    }

    let initialLang = 'tr';
    try {
      const storedLang = localStorage.getItem(LANG_KEY);
      if (storedLang === 'tr' || storedLang === 'en') initialLang = storedLang;
    } catch (e) { /* yoksay */ }

    applyLanguage(initialLang);

    langButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        if (!lang || lang === currentLang) return;
        applyLanguage(lang);
        try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* yoksay */ }
      });
    });
  }

  /* =====================================================================
     RENDER: PROJECTS
     projects[] → DOM. Aynı class/attribute yapısını üretir (Phase 1'deki
     statik HTML ile birebir aynı), böylece style.css ve initProjectFilters()/
     initProjectModal() değişmeden çalışmaya devam eder.

     Güvenlik: innerHTML KULLANILMIYOR. Tüm elementler createElement ile
     oluşturuluyor, tüm metinler textContent ile yazılıyor. Şu an projects[]
     geliştirici-kontrollü statik veri olsa da, Phase 3'te API'den gelecek
     "güvenilmeyen veri" senaryosuna baştan hazır olması için bu disiplin
     korunuyor.
     ===================================================================== */
  function createProjectCard(project) {
    const article = document.createElement('article');
    article.className = `project reveal-up project--${project.layout}`;
    article.dataset.cursor = 'view';
    article.dataset.category = project.category;
    article.dataset.projectId = project.id;
    if (project.link) article.dataset.projectLink = project.link;
    // Modal'ı klavye ile de tetikleyebilmek için (bkz. initProjectModal
    // içindeki event delegation — click ve keydown aynı .project hedefini kullanır)
    article.tabIndex = 0;
    article.setAttribute('role', 'button');

    const imageWrap = document.createElement('div');
    imageWrap.className = 'project-image';

    const img = document.createElement('img');
    img.setAttribute('src', resolveAssetUrl(project.imageUrl));
    img.setAttribute('alt', project.imageAlt);
    img.setAttribute('loading', 'lazy');
    img.addEventListener('error', () => { img.style.display = 'none'; });
    imageWrap.appendChild(img);

    const meta = document.createElement('div');
    meta.className = 'project-meta';

    const indexEl = document.createElement('span');
    indexEl.className = 'project-index';
    indexEl.textContent = `PROJECT ${String(project.id).padStart(2, '0')}`;

    const nameEl = document.createElement('h3');
    nameEl.className = 'project-name';
    nameEl.textContent = project.title;

    const tagEl = document.createElement('span');
    tagEl.className = 'project-tag';
    tagEl.textContent = project.tag;

    meta.append(indexEl, nameEl, tagEl);
    article.append(imageWrap, meta);
    return article;
  }

  function renderProjects() {
    const grid = document.getElementById('workGrid');
    if (!grid) return;
    grid.querySelectorAll('.project, .api-content-status').forEach((element) => element.remove());
    const fragment = document.createDocumentFragment();
    projects.forEach((project) => fragment.appendChild(createProjectCard(project)));
    grid.appendChild(fragment);
  }

  /* =====================================================================
     RENDER: SERVICES
     services[] → DOM. .service-preview elementi kalıcı/paylaşılan bir
     eleman olduğu için index.html'de statik kalıyor; sadece satırlar
     (.service-row) render ediliyor ve onun önüne ekleniyor (DOM sırası
     Phase 1 ile aynı kalsın diye).
     ===================================================================== */
  function createServiceRow(service) {
    const row = document.createElement('div');
    row.className = 'service-row reveal-up';
    row.dataset.previewImage = resolveAssetUrl(service.previewImageUrl);

    const indexEl = document.createElement('span');
    indexEl.className = 'service-index';
    indexEl.textContent = String(service.id).padStart(2, '0');

    const nameEl = document.createElement('span');
    nameEl.className = 'service-name';
    nameEl.textContent = currentLang === 'tr' ? service.nameTr : service.nameEn;

    const arrowEl = document.createElement('span');
    arrowEl.className = 'service-arrow';
    arrowEl.setAttribute('aria-hidden', 'true');
    arrowEl.textContent = '→';

    row.append(indexEl, nameEl, arrowEl);
    return row;
  }

  function renderServices() {
    const list = document.getElementById('servicesList');
    if (!list) return;
    const preview = document.getElementById('servicePreview');
    list.querySelectorAll('.service-row, .api-content-status').forEach((element) => element.remove());
    const fragment = document.createDocumentFragment();
    services.forEach((service) => fragment.appendChild(createServiceRow(service)));
    if (preview) {
      list.insertBefore(fragment, preview);
    } else {
      list.appendChild(fragment);
    }
  }

  function setContentState(container, state, message) {
    if (!container) return;
    container.setAttribute('aria-busy', String(state === 'loading'));
    container.querySelectorAll('.api-content-status').forEach((element) => element.remove());
    if (!message) return;

    const status = document.createElement('p');
    status.className = 'api-content-status';
    status.textContent = message;
    const preview = container.querySelector('#servicePreview');
    if (preview) container.insertBefore(status, preview);
    else container.appendChild(status);
  }

  async function loadPublicContent() {
    const projectsGrid = document.getElementById('workGrid');
    const servicesList = document.getElementById('servicesList');
    setContentState(projectsGrid, 'loading', t('content.loading'));
    setContentState(servicesList, 'loading', t('content.loading'));

    const [projectsResult, servicesResult] = await Promise.allSettled([
      apiRequest('/api/projects'),
      apiRequest('/api/services'),
    ]);

    if (projectsResult.status === 'fulfilled' && Array.isArray(projectsResult.value)) {
      projects = projectsResult.value;
      renderProjects();
      setContentState(projectsGrid, 'idle');
    } else {
      console.error('Projects API could not be loaded.', projectsResult.reason);
      setContentState(projectsGrid, 'error', t('content.projectsUnavailable'));
    }

    if (servicesResult.status === 'fulfilled' && Array.isArray(servicesResult.value)) {
      services = servicesResult.value;
      renderServices();
      setContentState(servicesList, 'idle');
    } else {
      console.error('Services API could not be loaded.', servicesResult.reason);
      setContentState(servicesList, 'error', t('content.servicesUnavailable'));
    }
  }

  /* =====================================================================
     CURSOR + HERO PARALLAX + FOTOĞRAF HOVER
     Tek bir requestAnimationFrame döngüsü; mousemove sadece hedef
     değerleri günceller, render işini rAF yapar.
     ===================================================================== */
  function initCursorSystem() {
    const cursorEl = document.getElementById('cursor');
    const heroBg = document.getElementById('heroBg');
    const heroImage = document.getElementById('heroImage');
    const heroTitle = document.getElementById('heroTitle');

    const mouse = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
    const parallax = { x: 0, y: 0 }; // -1 → 1 aralığında normalize edilmiş konum

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      parallax.x = (mouse.x / window.innerWidth - 0.5) * 2;
      parallax.y = (mouse.y / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    // --- Custom cursor state (hover / view) ---
    function updateCursorState(target) {
      if (!cursorEl) return;
      const interactive = target.closest('[data-cursor="hover"]');
      const viewable = target.closest('[data-cursor="view"]');
      cursorEl.classList.toggle('is-hover', Boolean(interactive) && !viewable);
      cursorEl.classList.toggle('is-view', Boolean(viewable));
    }

    if (supportsHover) {
      document.addEventListener('mouseover', (e) => updateCursorState(e.target), { passive: true });
    }

    // --- Hero parallax derinlik katsayıları ---
    const DEPTH = {
      bg: 6,       // en az hareket eden katman
      image: 18,   // orta miktarda hareket
      title: -10,  // ters yönde, az hareket
    };

    const current = {
      bgX: 0, bgY: 0,
      imgX: 0, imgY: 0,
      titleX: 0, titleY: 0,
      cursorX: mouse.x, cursorY: mouse.y,
    };

    const LERP_CURSOR = 0.45;
    const LERP_PARALLAX = 0.06;

    function lerp(start, end, t2) {
      return start + (end - start) * t2;
    }

    function renderFrame() {
      if (supportsHover && cursorEl) {
        current.cursorX = lerp(current.cursorX, mouse.x, LERP_CURSOR);
        current.cursorY = lerp(current.cursorY, mouse.y, LERP_CURSOR);
        cursorEl.style.transform = `translate3d(${current.cursorX}px, ${current.cursorY}px, 0)`;
      }

      if (supportsHover && !prefersReducedMotion) {
        current.bgX = lerp(current.bgX, parallax.x * DEPTH.bg, LERP_PARALLAX);
        current.bgY = lerp(current.bgY, parallax.y * DEPTH.bg, LERP_PARALLAX);
        if (heroBg) heroBg.style.transform = `translate3d(${current.bgX}px, ${current.bgY}px, 0)`;

        current.imgX = lerp(current.imgX, parallax.x * DEPTH.image, LERP_PARALLAX);
        current.imgY = lerp(current.imgY, parallax.y * DEPTH.image, LERP_PARALLAX);
        if (heroImage) heroImage.style.transform = `translate(0, -50%) translate3d(${current.imgX}px, ${current.imgY}px, 0)`;

        current.titleX = lerp(current.titleX, parallax.x * DEPTH.title, LERP_PARALLAX);
        current.titleY = lerp(current.titleY, parallax.y * DEPTH.title, LERP_PARALLAX);
        if (heroTitle) heroTitle.style.transform = `translate3d(${current.titleX}px, ${current.titleY}px, 0)`;
      }

      requestAnimationFrame(renderFrame);
    }

    requestAnimationFrame(renderFrame);

    // --- Fotoğraf üzerinde hafif parallax (mouse takibi değil) ---
    const PHOTO_PARALLAX_RANGE = 8; // piksel

    document.querySelectorAll('.project-image').forEach((wrapper) => {
      const img = wrapper.querySelector('img');
      if (!img) return;

      wrapper.addEventListener('mousemove', (e) => {
        if (!supportsHover || prefersReducedMotion) return;
        const rect = wrapper.getBoundingClientRect();
        const relX = (e.clientX - rect.left) / rect.width - 0.5;
        const relY = (e.clientY - rect.top) / rect.height - 0.5;
        img.style.transform =
          `scale(1.06) translate3d(${relX * PHOTO_PARALLAX_RANGE}px, ${relY * PHOTO_PARALLAX_RANGE}px, 0)`;
      }, { passive: true });

      wrapper.addEventListener('mouseleave', () => {
        img.style.transform = '';
      });
    });
  }

  /* =====================================================================
     SCROLL REVEAL — IntersectionObserver
     Ekrana giren elementlere .is-visible eklenir; tekrar viewport dışına
     çıkınca class kaldırılmaz (animasyon tekrar tekrar tetiklenmesin diye).
     ===================================================================== */
  function initScrollReveal() {
    const revealTargets = document.querySelectorAll('.reveal-up, .reveal-word');
    if (!revealTargets.length) return;

    if (!('IntersectionObserver' in window)) {
      revealTargets.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const delay = entry.target.dataset.revealDelay || 0;
          setTimeout(() => entry.target.classList.add('is-visible'), delay);
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

    revealTargets.forEach((el, i) => {
      if (el.closest('.hero-title') || el.classList.contains('hero-meta')) {
        el.dataset.revealDelay = i * 120;
      }
      revealObserver.observe(el);
    });
  }

  /* =====================================================================
     SERVICES — hover'da küçük görsel önizleme
     ===================================================================== */
  function initServicePreview() {
    const servicePreview = document.getElementById('servicePreview');
    const servicePreviewImg = document.getElementById('servicePreviewImg');
    const rows = document.querySelectorAll('.service-row');
    if (!servicePreview || !servicePreviewImg || !rows.length) return;

    rows.forEach((row) => {
      row.addEventListener('mouseenter', () => {
        servicePreviewImg.src = row.dataset.previewImage || '';
        servicePreviewImg.style.opacity = '1';
        servicePreviewImg.onerror = () => { servicePreviewImg.style.opacity = '0'; };
        servicePreview.classList.add('is-active');
      });

      row.addEventListener('mousemove', (e) => {
        const offsetY = e.clientY - 130;
        servicePreview.style.top = `${Math.max(offsetY, 0)}px`;
      }, { passive: true });

      row.addEventListener('mouseleave', () => {
        servicePreview.classList.remove('is-active');
      });
    });
  }

  /* =====================================================================
     MOBİL MENÜ
     Hamburger toggle + ESC ile kapama + link click ile kapama +
     body scroll lock + kapanınca focus'un hamburger'a dönmesi.
     ===================================================================== */
  function initMobileMenu() {
    const navToggle = document.getElementById('navToggle');
    const mainNav = document.getElementById('mainNav');
    if (!navToggle || !mainNav) return;

    let isOpen = false;

    function openMenu() {
      isOpen = true;
      mainNav.classList.add('is-open');
      navToggle.setAttribute('aria-expanded', 'true');
      lockScroll();
    }

    function closeMenu({ returnFocus } = { returnFocus: false }) {
      if (!isOpen) return;
      isOpen = false;
      mainNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      unlockScroll();
      if (returnFocus) navToggle.focus();
    }

    navToggle.addEventListener('click', () => {
      if (isOpen) {
        closeMenu({ returnFocus: false });
      } else {
        openMenu();
      }
    });

    mainNav.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', () => closeMenu({ returnFocus: false }));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeMenu({ returnFocus: true });
      }
    });
  }

  /* =====================================================================
     NAVİGASYON — hash'siz smooth scroll + IntersectionObserver ile
     aktif nav-link takibi.
     ===================================================================== */
  function initNavigation() {
    const scrollTargets = [
      { id: 'home', selector: 'a[href="#home"]' },
      { id: 'work', selector: 'a[href="#work"]' },
      { id: 'services', selector: 'a[href="#services"]' },
      { id: 'about', selector: 'a[href="#about"]' },
      { id: 'contact', selector: 'a[href="#contact"]' },
    ];

    // --- Tıklamada preventDefault + scrollIntoView: URL'ye hash eklenmez ---
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const targetId = link.getAttribute('href').slice(1);
        const targetEl = document.getElementById(targetId);
        if (!targetEl) return; // hedef yoksa native davranışa izin ver
        e.preventDefault();
        targetEl.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'start',
        });
      });
    });

    // --- Aktif section takibi ---
    const navLinks = document.querySelectorAll('.nav-link');
    if (!navLinks.length || !('IntersectionObserver' in window)) return;

    const sections = scrollTargets
      .map((t2) => document.getElementById(t2.id))
      .filter(Boolean);
    if (!sections.length) return;

    function setActiveLink(sectionId) {
      navLinks.forEach((link) => {
        const isMatch = link.getAttribute('href') === `#${sectionId}`;
        link.classList.toggle('is-active', isMatch);
      });
    }

    const navObserver = new IntersectionObserver((entries) => {
      // En çok görünür olan section'ı aktif kabul et
      let mostVisible = null;
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!mostVisible || entry.intersectionRatio > mostVisible.intersectionRatio) {
            mostVisible = entry;
          }
        }
      });
      if (mostVisible) setActiveLink(mostVisible.target.id);
    }, { threshold: [0.25, 0.5, 0.75], rootMargin: '-96px 0px -40% 0px' });

    sections.forEach((section) => navObserver.observe(section));
  }

  /* =====================================================================
     PROJECT FILTERS
     data-category="all|web|branding|social" — iki adımlı geçiş:
     önce opacity/scale ile solar, transitionend'de hidden attribute'u
     eklenir (grid'de boşluk kalmasın diye). Tekrar gösterilirken sıra ters.
     ===================================================================== */
  function initProjectFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const grid = document.getElementById('workGrid');
    if (!filterButtons.length || !grid) return;

    function showProject(project) {
      project.removeAttribute('hidden');
      // reflow zorla, sonra fade-in class'ını kaldırarak transition'ı tetikle
      void project.offsetHeight;
      project.classList.remove('is-filtered-out');
    }

    function hideProject(project) {
      project.classList.add('is-filtered-out');
      if (prefersReducedMotion) {
        project.setAttribute('hidden', '');
        return;
      }
      const onEnd = (e) => {
        if (e.target !== project) return;
        project.setAttribute('hidden', '');
        project.removeEventListener('transitionend', onEnd);
      };
      project.addEventListener('transitionend', onEnd);
    }

    function applyFilter(filter) {
      // Her seferinde canlı DOM'dan okunuyor (grid.querySelectorAll),
      // renderProjects() sonrası eklenen/kaldırılan kartlar da kapsanır.
      grid.querySelectorAll('.project[data-category]').forEach((project) => {
        const matches = filter === 'all' || project.dataset.category === filter;
        if (matches) {
          showProject(project);
        } else {
          hideProject(project);
        }
      });
    }

    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        if (!filter) return;
        filterButtons.forEach((b) => b.classList.toggle('is-active', b === btn));
        applyFilter(filter);
      });
    });
  }

  /* =====================================================================
     PROJECT MODAL
     Proje kartına tıklayınca detay modalı. ESC / overlay click / close
     button ile kapanır, focus modal içine geçer ve kapanınca tetikleyen
     karta geri döner. Tüm dinamik metinler textContent ile yazılır.
     ===================================================================== */
  function initProjectModal() {
    const modal = document.getElementById('projectModal');
    const dialog = document.getElementById('projectModalDialog');
    const imageEl = document.getElementById('projectModalImage');
    const categoryEl = document.getElementById('projectModalCategory');
    const titleEl = document.getElementById('projectModalTitle');
    const descriptionEl = document.getElementById('projectModalDescription');
    const linkEl = document.getElementById('projectModalLink');
    const grid = document.getElementById('workGrid');

    if (!modal || !dialog || !grid) return;

    let lastTrigger = null;
    let isOpen = false;

    function populate(trigger) {
      const id = trigger.dataset.projectId;
      const project = projects.find((item) => String(item.id) === id);
      const img = trigger.querySelector('.project-image img');
      const titleSource = trigger.querySelector('.project-name');

      // Görsel — kullanıcı verisi değil, sitenin kendi assetleri
      if (img && img.getAttribute('src')) {
        imageEl.src = img.getAttribute('src');
        imageEl.alt = img.getAttribute('alt') || '';
      } else {
        imageEl.removeAttribute('src');
        imageEl.alt = '';
      }

      // Metinler — textContent, innerHTML DEĞİL (kontrolsüz DOM yazımı yok)
      titleEl.textContent = titleSource ? titleSource.textContent : '';
      categoryEl.textContent = project
        ? currentLang === 'tr' ? project.categoryLabelTr : project.categoryLabelEn
        : '';
      descriptionEl.textContent = project
        ? currentLang === 'tr' ? project.descriptionTr : project.descriptionEn
        : '';

      // Dış link — yalnızca güvenli şemalarla (http/https/mailto) set edilir.
      // Phase 3'te bu veri API'den gelince rastgele "javascript:" vb. bir
      // şemanın <a href>'e yazılmasını engellemek için baştan kısıtlanıyor.
      const href = trigger.dataset.projectLink || '';
      const isSafeUrl = /^(https?:|mailto:)/i.test(href);
      if (href && isSafeUrl) {
        linkEl.setAttribute('href', href);
        linkEl.hidden = false;
      } else {
        linkEl.removeAttribute('href');
        linkEl.hidden = true;
      }
    }

    function openModal(trigger) {
      lastTrigger = trigger;
      populate(trigger);
      isOpen = true;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      lockScroll();
      dialog.focus();
      document.addEventListener('keydown', onKeydown);
    }

    function closeModal() {
      if (!isOpen) return;
      isOpen = false;
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      unlockScroll();
      document.removeEventListener('keydown', onKeydown);
      if (lastTrigger) lastTrigger.focus();
    }

    function onKeydown(e) {
      if (e.key === 'Escape') {
        closeModal();
        return;
      }
      // Basit focus trap: Tab ile modal dışına çıkılmasın
      if (e.key === 'Tab') {
        const focusable = dialog.querySelectorAll(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    /* --- Event delegation: workGrid üzerinde TEK click/keydown listener ---
       Kartlar renderProjects() ile dinamik oluşturulduğu için tek tek
       listener bağlamak yerine, üst container'da dinleyip closest('.project')
       ile hedef kart tespit ediliyor. Kart içinde ileride gerçek bir
       <a>/<button> olursa (örn. "harici link" gibi), onun kendi native
       davranışı çalışsın diye modal tetiklenmiyor. */
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.project');
      if (!card || !grid.contains(card)) return;
      const nestedControl = e.target.closest('a, button');
      if (nestedControl && nestedControl !== card) return;
      openModal(card);
    });

    grid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.project');
      if (!card || !grid.contains(card)) return;
      const nestedControl = e.target.closest('a, button');
      if (nestedControl && nestedControl !== card) return;
      e.preventDefault();
      openModal(card);
    });

    modal.querySelectorAll('[data-modal-close]').forEach((el) => {
      el.addEventListener('click', closeModal);
    });

    // Dil değiştiğinde modal açıksa içeriği yeniden çevir
    document.addEventListener(LANG_CHANGE_EVENT, () => {
      if (isOpen && lastTrigger) populate(lastTrigger);
    });
  }

  /* =====================================================================
     FORM VALIDATION
     Client-side validation is for UX only; server-side validation will
     be required when the backend is added.
     ===================================================================== */
  function initFormValidation() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const status = document.getElementById('formStatus');
    const submitBtn = form.querySelector('.form-submit');
    const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const fieldRules = {
      name: { required: true, minLength: 2, maxLength: 80 },
      email: { required: true, maxLength: 120, pattern: EMAIL_PATTERN, patternKey: 'form.error.email' },
      service: { required: true },
      message: { required: true, minLength: 10, maxLength: 1000 },
    };

    function getRow(field) {
      return field.closest('.form-row');
    }

    function getErrorEl(field) {
      return form.querySelector(`[data-error-for="${field.name}"]`);
    }

    function setError(field, message) {
      const row = getRow(field);
      const errorEl = getErrorEl(field);
      if (row) row.classList.add('has-error');
      if (errorEl) errorEl.textContent = message;
    }

    function clearError(field) {
      const row = getRow(field);
      const errorEl = getErrorEl(field);
      if (row) row.classList.remove('has-error');
      if (errorEl) errorEl.textContent = '';
    }

    // --- Saf doğrulama: yalnızca sonucu döner, kendisi DOM'a yazmaz ---
    function validateFieldValue(field) {
      const rules = fieldRules[field.name];
      if (!rules) return { isValid: true };

      const value = field.value.trim();

      if (rules.required && !value) {
        return { isValid: false, message: t('form.error.required') };
      }
      if (rules.minLength && value.length < rules.minLength) {
        return { isValid: false, message: t('form.error.minLength', { min: rules.minLength }) };
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        return { isValid: false, message: t('form.error.maxLength', { max: rules.maxLength }) };
      }
      if (rules.pattern && value && !rules.pattern.test(value)) {
        return { isValid: false, message: t(rules.patternKey || 'form.error.required') };
      }

      return { isValid: true };
    }

    // Tek alanı doğrulayıp DOM'u günceller (blur event'i için)
    function validateField(field) {
      const result = validateFieldValue(field);
      if (result.isValid) {
        clearError(field);
      } else {
        setError(field, result.message);
      }
      return result.isValid;
    }

    // --- validateForm(): tüm formu doğrular, hata state'lerini DOM'a yazar,
    //     {isValid, errors} döner. submitForm() bunu kullanır. ---
    function validateForm() {
      let isValid = true;
      const errors = {};

      Object.keys(fieldRules).forEach((name) => {
        const field = form.elements[name];
        if (!field) return;
        const result = validateFieldValue(field);
        if (result.isValid) {
          clearError(field);
        } else {
          isValid = false;
          errors[name] = result.message;
          setError(field, result.message);
        }
      });

      return { isValid, errors };
    }

    let formState = 'idle';
    let formStatusKey = null;

    // --- setFormState(): idle | loading | success | error ---
    // Formun görünür durumunu (mesaj + submit butonu) tek yerden yönetir.
    function setFormState(state, statusKey = null) {
      formState = state;
      formStatusKey = statusKey;
      if (submitBtn) submitBtn.disabled = state === 'loading';
      if (!status) return;

      if (state === 'success') {
        status.textContent = t(statusKey || 'form.status.success');
        status.classList.add('is-success');
      } else if (state === 'error') {
        status.textContent = t(statusKey || 'form.status.error');
        status.classList.remove('is-success');
      } else {
        // 'idle' ve 'loading' — henüz gösterilecek bir sonuç yok
        status.textContent = '';
        status.classList.remove('is-success');
      }
    }

    async function submitForm() {
      setFormState('loading');
      const payload = {
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim(),
        company: form.elements.company.value.trim() || null,
        service: form.elements.service.value,
        message: form.elements.message.value.trim(),
      };

      try {
        await apiRequest('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        form.reset();
        setFormState('success');
      } catch (error) {
        if (error.status === 400) {
          const fieldsWithServerErrors = new Set();
          (error.details || []).forEach((detail) => {
            const fieldName = ['name', 'email', 'company', 'service', 'message']
              .find((name) => String(detail).startsWith(name));
            if (fieldName && form.elements[fieldName]) {
              fieldsWithServerErrors.add(fieldName);
              setError(form.elements[fieldName], t('form.status.validation'));
            }
          });
          setFormState('error', 'form.status.validation');
          const firstError = fieldsWithServerErrors.values().next().value;
          if (firstError) form.elements[firstError].focus();
        } else if (error.status === 429) {
          setFormState('error', 'form.status.rateLimit');
        } else if (error.status) {
          setFormState('error', 'form.status.server');
        } else {
          setFormState('error', 'form.status.network');
        }
      }
    }

    document.addEventListener(LANG_CHANGE_EVENT, () => {
      if (formState === 'success' || formState === 'error') setFormState(formState, formStatusKey);
    });

    // Alan terk edildiğinde (blur) anlık doğrula
    Object.keys(fieldRules).forEach((name) => {
      const field = form.elements[name];
      if (!field) return;
      field.addEventListener('blur', () => validateField(field));
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const { isValid } = validateForm();

      if (isValid) {
        submitForm();
      } else {
        setFormState('error');
        const firstError = form.querySelector('.has-error input, .has-error select, .has-error textarea');
        if (firstError) firstError.focus();
      }
    });
  }

  /* =====================================================================
     LOADER — açılış animasyonu (loader → başlık → görsel maskesi)
     ===================================================================== */
  function initLoader() {
    const loader = document.getElementById('loader');
    const heroImage = document.getElementById('heroImage');

    function playOpeningSequence() {
      if (prefersReducedMotion) {
        if (loader) loader.classList.add('is-hidden');
        if (heroImage) heroImage.classList.add('is-revealed');
        return;
      }

      if (loader) {
        loader.classList.add('is-visible');
        window.setTimeout(() => {
          loader.classList.remove('is-visible');
          loader.classList.add('is-hidden');
        }, 700);
      }

      window.setTimeout(() => {
        if (heroImage) heroImage.classList.add('is-revealed');
      }, 650);
    }

    window.addEventListener('DOMContentLoaded', playOpeningSequence);
  }

  /* =====================================================================
     HEADER SCROLL — scroll'da koyu arka plan (performanslı: passive
     listener + sadece bir class toggle edilir)
     ===================================================================== */
  function initHeaderScroll() {
    const header = document.getElementById('siteHeader');
    if (!header) return;

    let lastScrollState = false;

    function handleScroll() {
      const scrolled = window.scrollY > 40;
      if (scrolled !== lastScrollState) {
        header.classList.toggle('is-scrolled', scrolled);
        lastScrollState = scrolled;
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  /* =====================================================================
     BAŞLAT — API verisi render edilmeden DOM'a bağlı modüller başlatılmaz.
     ===================================================================== */
  async function initialize() {
    initTheme();
    initLanguage();
    initMobileMenu();
    initNavigation();
    initFormValidation();
    initLoader();
    initHeaderScroll();

    await loadPublicContent();

    initCursorSystem();
    initScrollReveal();
    initServicePreview();
    initProjectFilters();
    initProjectModal();
  }

  void initialize();

})();
