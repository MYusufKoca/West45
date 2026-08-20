const allowedServices = new Set(['web-design', 'branding', 'social-media', 'other']);
const allowedFields = new Set(['name', 'email', 'company', 'service', 'message']);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateContactRequest(input) {
  const errors = [];
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};

  Object.keys(source).forEach((field) => {
    if (!allowedFields.has(field)) errors.push(`Unexpected field: ${field}.`);
  });

  const name = typeof source.name === 'string' ? source.name.trim() : '';
  const email = typeof source.email === 'string' ? source.email.trim().toLowerCase() : '';
  const company = source.company === undefined || source.company === null
    ? null
    : typeof source.company === 'string' ? source.company.trim() : '';
  const service = typeof source.service === 'string' ? source.service.trim() : '';
  const message = typeof source.message === 'string' ? source.message.trim() : '';

  if (name.length < 2 || name.length > 80) errors.push('name must be between 2 and 80 characters.');
  if (email.length === 0 || email.length > 120 || !emailPattern.test(email)) {
    errors.push('email must be a valid email address with at most 120 characters.');
  }
  if (company !== null && (company.length === 0 || company.length > 80)) {
    errors.push('company must be omitted or between 1 and 80 characters.');
  }
  if (!allowedServices.has(service)) {
    errors.push('service must be one of: web-design, branding, social-media, other.');
  }
  if (message.length < 10 || message.length > 1000) {
    errors.push('message must be between 10 and 1000 characters.');
  }

  return {
    errors,
    value: { name, email, company, service, message },
  };
}

module.exports = { validateContactRequest };
