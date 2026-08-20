const allowedCategories = new Set(['web', 'branding', 'social']);
const allowedLayouts = new Set(['wide', 'tall']);
const allowedLinkProtocols = new Set(['http:', 'https:', 'mailto:']);

function validateRequiredString(value, field, minLength, maxLength, errors) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push(`${field} is required.`);
    return;
  }

  const length = value.trim().length;
  if (length < minLength || length > maxLength) {
    errors.push(`${field} must be between ${minLength} and ${maxLength} characters.`);
  }
}

function validateProject(project) {
  const errors = [];

  validateRequiredString(project.title, 'title', 2, 120, errors);
  validateRequiredString(project.tag, 'tag', 1, 120, errors);
  validateRequiredString(project.categoryLabelTr, 'categoryLabelTr', 1, 60, errors);
  validateRequiredString(project.categoryLabelEn, 'categoryLabelEn', 1, 60, errors);
  validateRequiredString(project.descriptionTr, 'descriptionTr', 1, 600, errors);
  validateRequiredString(project.descriptionEn, 'descriptionEn', 1, 600, errors);
  validateRequiredString(project.imageUrl, 'imageUrl', 1, 400, errors);
  validateRequiredString(project.imageAlt, 'imageAlt', 1, 200, errors);

  if (!allowedCategories.has(project.category)) errors.push('category must be one of: web, branding, social.');
  if (!allowedLayouts.has(project.layout)) errors.push('layout must be one of: wide, tall.');
  if (!Number.isInteger(project.displayOrder) || project.displayOrder < 0) {
    errors.push('displayOrder must be an integer greater than or equal to 0.');
  }

  if (project.link !== null && project.link !== undefined) {
    if (typeof project.link !== 'string' || project.link.length === 0 || project.link.length > 400) {
      errors.push('link must be null or a URL with at most 400 characters.');
    } else {
      try {
        if (!allowedLinkProtocols.has(new URL(project.link).protocol)) {
          errors.push('link must use http:, https:, or mailto:.');
        }
      } catch {
        errors.push('link must use http:, https:, or mailto:.');
      }
    }
  }

  return errors;
}

module.exports = { validateProject };
