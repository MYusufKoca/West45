const { validateContactRequest } = require('../validators/contactValidator');
const { createContactRequest } = require('../services/contactService');

async function submitContactRequest(req, res) {
  const { errors, value } = validateContactRequest(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  try {
    const contact = await createContactRequest(value);
    return res.status(201).json({ id: contact.id, message: 'Contact request received' });
  } catch (error) {
    console.error('Failed to create contact request:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { submitContactRequest };
