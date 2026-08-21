(() => {
  'use strict';

  const CONFIG = {
    API_BASE_URL: 'https://west45.onrender.com',
    TOKEN_KEY: 'west45-admin-token',
  };

  const projectFields = [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'tag', label: 'Tag', type: 'text', required: true },
    { name: 'category', label: 'Category', type: 'select', options: ['web', 'branding', 'social'], required: true },
    { name: 'layout', label: 'Layout', type: 'select', options: ['wide', 'tall'], required: true },
    { name: 'categoryLabelTr', label: 'Category label (TR)', type: 'text', required: true },
    { name: 'categoryLabelEn', label: 'Category label (EN)', type: 'text', required: true },
    { name: 'displayOrder', label: 'Display order', type: 'number', required: true, min: 0 },
    { name: 'imageUrl', label: 'Image URL', type: 'text', required: true, full: true },
    { name: 'imageAlt', label: 'Image alt text', type: 'text', required: true, full: true },
    { name: 'link', label: 'External link (optional)', type: 'url', full: true },
    { name: 'descriptionTr', label: 'Description (TR)', type: 'textarea', required: true, full: true },
    { name: 'descriptionEn', label: 'Description (EN)', type: 'textarea', required: true, full: true },
  ];

  const serviceFields = [
    { name: 'nameTr', label: 'Name (TR)', type: 'text', required: true },
    { name: 'nameEn', label: 'Name (EN)', type: 'text', required: true },
    { name: 'displayOrder', label: 'Display order', type: 'number', required: true, min: 0 },
    { name: 'previewImageUrl', label: 'Preview image URL (optional)', type: 'url', full: true },
  ];

  const loginView = document.getElementById('loginView');
  const dashboard = document.getElementById('dashboard');
  const loginForm = document.getElementById('loginForm');
  const loginMessage = document.getElementById('loginMessage');
  const pageMessage = document.getElementById('pageMessage');
  const recordList = document.getElementById('recordList');
  const editor = document.getElementById('editor');
  const editorForm = document.getElementById('editorForm');
  const editorTitle = document.getElementById('editorTitle');
  const dashboardTitle = document.getElementById('dashboardTitle');
  const createButton = document.getElementById('createButton');
  const cancelButton = document.getElementById('cancelButton');

  let activeSection = 'projects';
  let records = [];
  let editingRecord = null;

  function getToken() { return sessionStorage.getItem(CONFIG.TOKEN_KEY); }
  function setMessage(element, message = '', success = false) {
    element.textContent = message;
    element.classList.toggle('is-success', success);
  }
  function showLogin(message = '') {
    sessionStorage.removeItem(CONFIG.TOKEN_KEY);
    dashboard.hidden = true;
    loginView.hidden = false;
    loginForm.reset();
    setMessage(loginMessage, message);
    document.getElementById('adminUsername').focus();
  }
  function showDashboard() {
    loginView.hidden = true;
    dashboard.hidden = false;
  }

  async function apiRequest(endpoint, options = {}, requiresAuth = false) {
    const headers = { Accept: 'application/json', ...options.headers };
    if (requiresAuth) headers.Authorization = `Bearer ${getToken() || ''}`;

    let response;
    try {
      response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
        ...options,
        cache: options.cache || 'no-store',
        headers,
      });
    } catch {
      const error = new Error('network');
      error.kind = 'network';
      throw error;
    }

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const body = response.status === 204 ? null : isJson ? await response.json().catch(() => null) : null;
    if (!response.ok) {
      const error = new Error('request');
      error.status = response.status;
      error.details = body?.details;
      throw error;
    }
    return body;
  }

  function handleRequestError(error, target = pageMessage) {
    if (error.status === 401) {
      showLogin('Session expired, please sign in again.');
      return;
    }
    const messages = {
      400: 'Please review the form fields and try again.',
      404: 'This record is no longer available.',
      429: 'Too many requests. Please try again later.',
      500: 'The server could not complete the request. Please try again later.',
    };
    setMessage(target, messages[error.status] || 'A connection error occurred. Please try again later.');
  }

  function isMessagesSection() { return activeSection === 'messages'; }
  function fieldsForActiveSection() { return activeSection === 'projects' ? projectFields : serviceFields; }
  function endpointForActiveSection() {
    if (activeSection === 'projects') return '/api/projects';
    if (activeSection === 'services') return '/api/services';
    return '/api/contact';
  }
  function titleForActiveSection() {
    if (activeSection === 'projects') return 'PROJECTS';
    if (activeSection === 'services') return 'SERVICES';
    return 'MESSAGES';
  }

  function setActiveNavigation() {
    document.querySelectorAll('.nav-button').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.section === activeSection);
    });
    dashboardTitle.textContent = titleForActiveSection();
    createButton.hidden = isMessagesSection();
    if (!isMessagesSection()) createButton.textContent = activeSection === 'projects' ? 'NEW PROJECT' : 'NEW SERVICE';
  }

  function clearEditor() {
    editingRecord = null;
    editorForm.replaceChildren();
    editor.hidden = true;
  }

  function createInput(field, record) {
    const wrapper = document.createElement('div');
    if (field.full) wrapper.className = 'full';
    const label = document.createElement('label');
    label.htmlFor = `editor-${field.name}`;
    label.textContent = field.label;
    let input;
    if (field.type === 'textarea') input = document.createElement('textarea');
    else if (field.type === 'select') {
      input = document.createElement('select');
      field.options.forEach((optionValue) => {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = optionValue;
        input.appendChild(option);
      });
    } else {
      input = document.createElement('input');
      input.type = field.type;
    }
    input.id = `editor-${field.name}`;
    input.name = field.name;
    input.required = Boolean(field.required);
    if (field.min !== undefined) input.min = String(field.min);
    const value = record?.[field.name];
    input.value = value === null || value === undefined ? '' : String(value);
    wrapper.append(label, input);
    return wrapper;
  }

  function openEditor(record = null) {
    editingRecord = record;
    editorForm.replaceChildren();
    const grid = document.createElement('div');
    grid.className = 'form-grid';
    fieldsForActiveSection().forEach((field) => grid.appendChild(createInput(field, record)));
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'primary-button';
    submit.textContent = record ? `SAVE ${activeSection === 'projects' ? 'PROJECT' : 'SERVICE'}` : `CREATE ${activeSection === 'projects' ? 'PROJECT' : 'SERVICE'}`;
    editorTitle.textContent = record ? `EDIT ${activeSection === 'projects' ? 'PROJECT' : 'SERVICE'}` : `NEW ${activeSection === 'projects' ? 'PROJECT' : 'SERVICE'}`;
    editorForm.append(grid, submit);
    editor.hidden = false;
    editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function formPayload() {
    const payload = {};
    fieldsForActiveSection().forEach((field) => {
      const input = editorForm.elements[field.name];
      let value = input.value.trim();
      if (field.type === 'number') value = Number(value);
      if (field.name === 'link' || field.name === 'previewImageUrl') value = value || null;
      payload[field.name] = value;
    });
    return payload;
  }

  function formatMessageDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'DATE UNAVAILABLE';
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(date).toUpperCase();
  }

  function renderRecords() {
    recordList.replaceChildren();
    if (!records.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = `No ${activeSection} found.`;
      recordList.appendChild(empty);
      return;
    }
    records.forEach((record) => {
      const card = document.createElement('article');
      card.className = 'record-card';
      const content = document.createElement('div');
      const title = document.createElement('h2');
      title.className = 'record-title';
      title.textContent = activeSection === 'projects' ? record.title : activeSection === 'services' ? record.nameEn : record.name;
      const meta = document.createElement('p');
      meta.className = 'record-meta';
      meta.textContent = activeSection === 'projects'
        ? `${record.category} · ${record.layout} · ORDER ${record.displayOrder}`
        : activeSection === 'services'
          ? `${record.nameTr} · ORDER ${record.displayOrder}`
          : `${record.email} · ${record.service.replace(/-/g, ' ').toUpperCase()} · ${formatMessageDate(record.createdAt)}`;
      content.append(title, meta);
      const actions = document.createElement('div');
      actions.className = 'record-actions';
      const primaryAction = document.createElement('button');
      primaryAction.type = 'button';
      primaryAction.textContent = isMessagesSection() ? 'VIEW' : 'EDIT';
      primaryAction.addEventListener('click', () => isMessagesSection() ? openMessageDetail(record.id) : openEditor(record));
      actions.appendChild(primaryAction);
      if (!isMessagesSection()) {
        const remove = document.createElement('button');
        remove.type = 'button'; remove.textContent = 'DELETE'; remove.addEventListener('click', () => deleteRecord(record));
        actions.appendChild(remove);
      }
      card.append(content, actions);
      recordList.appendChild(card);
    });
  }

  async function loadRecords() {
    recordList.setAttribute('aria-busy', 'true');
    setMessage(pageMessage);
    try {
      const data = await apiRequest(endpointForActiveSection(), {}, isMessagesSection());
      records = Array.isArray(data) ? data : [];
      renderRecords();
    } catch (error) {
      records = [];
      renderRecords();
      handleRequestError(error);
    } finally {
      recordList.setAttribute('aria-busy', 'false');
    }
  }

  function createMessageDetailItem(labelText, value, full = false) {
    const wrapper = document.createElement('div');
    wrapper.className = full ? 'detail-item full' : 'detail-item';
    const label = document.createElement('p');
    label.className = 'detail-label';
    label.textContent = labelText;
    const content = document.createElement('p');
    content.className = 'detail-value';
    content.textContent = value || '—';
    wrapper.append(label, content);
    return wrapper;
  }

  async function openMessageDetail(id) {
    clearEditor();
    editorTitle.textContent = 'MESSAGE DETAIL';
    editor.hidden = false;
    editorForm.setAttribute('aria-busy', 'true');
    setMessage(pageMessage);
    try {
      const message = await apiRequest(`/api/contact/${id}`, {}, true);
      const grid = document.createElement('div');
      grid.className = 'form-grid message-detail';
      grid.append(
        createMessageDetailItem('NAME', message.name),
        createMessageDetailItem('EMAIL', message.email),
        createMessageDetailItem('COMPANY', message.company),
        createMessageDetailItem('SERVICE', message.service.replace(/-/g, ' ').toUpperCase()),
        createMessageDetailItem('CREATED AT', formatMessageDate(message.createdAt)),
        createMessageDetailItem('MESSAGE', message.message, true),
      );
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'primary-button danger-button';
      remove.textContent = 'DELETE MESSAGE';
      remove.addEventListener('click', () => deleteMessage(message));
      editorForm.append(grid, remove);
      editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      clearEditor();
      handleRequestError(error);
    } finally {
      editorForm.setAttribute('aria-busy', 'false');
    }
  }

  async function deleteMessage(message) {
    if (!window.confirm(`Delete the message from “${message.name}”? This cannot be undone.`)) return;
    setMessage(pageMessage);
    try {
      await apiRequest(`/api/contact/${message.id}`, { method: 'DELETE' }, true);
      clearEditor();
      setMessage(pageMessage, 'Message deleted.', true);
      await loadRecords();
    } catch (error) {
      handleRequestError(error);
    }
  }

  async function saveRecord(event) {
    event.preventDefault();
    const submit = editorForm.querySelector('[type="submit"]');
    if (!editorForm.checkValidity()) {
      editorForm.reportValidity();
      return;
    }
    submit.disabled = true;
    setMessage(pageMessage);
    const isEditing = Boolean(editingRecord);
    try {
      await apiRequest(
        isEditing ? `${endpointForActiveSection()}/${editingRecord.id}` : endpointForActiveSection(),
        { method: isEditing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formPayload()) },
        true
      );
      clearEditor();
      setMessage(pageMessage, `${activeSection === 'projects' ? 'Project' : 'Service'} ${isEditing ? 'saved' : 'created'}.`, true);
      await loadRecords();
    } catch (error) {
      handleRequestError(error);
    } finally {
      if (editorForm.contains(submit)) submit.disabled = false;
    }
  }

  async function deleteRecord(record) {
    const recordName = activeSection === 'projects' ? record.title : record.nameEn;
    if (!window.confirm(`Delete “${recordName}”? This cannot be undone.`)) return;
    setMessage(pageMessage);
    try {
      await apiRequest(`${endpointForActiveSection()}/${record.id}`, { method: 'DELETE' }, true);
      clearEditor();
      setMessage(pageMessage, `${activeSection === 'projects' ? 'Project' : 'Service'} deleted.`, true);
      await loadRecords();
    } catch (error) {
      handleRequestError(error);
    }
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = loginForm.querySelector('[type="submit"]');
    const username = loginForm.elements.username.value.trim();
    const password = loginForm.elements.password.value;
    if (!username || !password) {
      setMessage(loginMessage, 'Username and password are required.');
      return;
    }
    submit.disabled = true;
    setMessage(loginMessage);
    try {
      const data = await apiRequest('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      if (!data?.token) throw new Error('request');
      sessionStorage.setItem(CONFIG.TOKEN_KEY, data.token);
      if (getToken() !== data.token) throw new Error('storage');
    } catch (error) {
      setMessage(loginMessage, error.status === 429 ? 'Too many attempts. Please try again later.' : 'Invalid username or password.');
      return;
    } finally {
      submit.disabled = false;
    }

    showDashboard();
    setActiveNavigation();
    void loadRecords();
  });

  document.querySelectorAll('.nav-button').forEach((button) => button.addEventListener('click', async () => {
    activeSection = button.dataset.section;
    clearEditor();
    setActiveNavigation();
    await loadRecords();
  }));
  createButton.addEventListener('click', () => openEditor());
  cancelButton.addEventListener('click', clearEditor);
  editorForm.addEventListener('submit', saveRecord);
  document.getElementById('logoutButton').addEventListener('click', () => showLogin());

  if (getToken()) {
    showDashboard();
    setActiveNavigation();
    void loadRecords();
  } else {
    showLogin();
  }
})();
