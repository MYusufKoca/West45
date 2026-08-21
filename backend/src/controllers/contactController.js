const { validateContactRequest } = require('../validators/contactValidator');
const {
  createContactRequest,
  getContactRequests,
  getContactRequestById,
  deleteContactRequest,
} = require('../services/contactService');

function parseContactId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

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

async function listContactRequests(req, res) {
  try {
    const contacts = await getContactRequests();
    return res.status(200).json(contacts);
  } catch (error) {
    console.error('Failed to fetch contact requests:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getContactRequest(req, res) {
  const id = parseContactId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid contact request id' });

  try {
    const contact = await getContactRequestById(id);
    if (!contact) return res.status(404).json({ error: 'Contact request not found' });
    return res.status(200).json(contact);
  } catch (error) {
    console.error('Failed to fetch contact request:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function removeContactRequest(req, res) {
  const id = parseContactId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid contact request id' });

  try {
    const deleted = await deleteContactRequest(id);
    if (!deleted) return res.status(404).json({ error: 'Contact request not found' });
    return res.status(204).send();
  } catch (error) {
    console.error('Failed to delete contact request:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  submitContactRequest,
  listContactRequests,
  getContactRequest,
  removeContactRequest,
};
