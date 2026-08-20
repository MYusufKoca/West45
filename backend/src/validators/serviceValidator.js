const allowedPreviewProtocols = new Set(['http:', 'https:']);

function validateService(service) {
  const errors = [];

  for (const [field, value] of [['nameTr', service.nameTr], ['nameEn', service.nameEn]]) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      errors.push(`${field} is required.`);
    } else if (value.trim().length > 120) {
      errors.push(`${field} must be between 1 and 120 characters.`);
    }
  }

  if (service.previewImageUrl !== null && service.previewImageUrl !== undefined) {
    if (typeof service.previewImageUrl !== 'string' || service.previewImageUrl.length === 0 || service.previewImageUrl.length > 400) {
      errors.push('previewImageUrl must be null or a URL with at most 400 characters.');
    } else {
      try {
        if (!allowedPreviewProtocols.has(new URL(service.previewImageUrl).protocol)) {
          errors.push('previewImageUrl must use http: or https:.');
        }
      } catch {
        errors.push('previewImageUrl must use http: or https:.');
      }
    }
  }

  if (!Number.isInteger(service.displayOrder) || service.displayOrder < 0) {
    errors.push('displayOrder must be an integer greater than or equal to 0.');
  }

  return errors;
}

module.exports = { validateService };
