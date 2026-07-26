const quoteModel = require('../models/quoteModel');

// ---------------------------------------------------------------------------
// POST /api/quotes   (protected, requireAuth)
//
// Body:
//   quote        string, required
// ---------------------------------------------------------------------------
async function createQuote(req, res, next) {
  try {
    const userId = req.user.userId;
    const { quote } = req.body;

    if (!quote?.trim()) {
      return res.status(400).json({ error: 'quote text is required' });
    }

    const created = await quoteModel.create(userId, {
      quote: quote.trim(),
    });

    const fullQuote = await quoteModel.findById(created.quote_id);

    return res.status(201).json({ quote: formatQuote(fullQuote) });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/quotes/:quoteId   (protected, requireAuth)
// Same ownership-in-the-query pattern as postController.deletePost /
// reviewController.deleteReview.
// ---------------------------------------------------------------------------
async function deleteQuote(req, res, next) {
  try {
    const userId = req.user.userId;
    const quoteId = Number(req.params.quoteId);
    if (!Number.isInteger(quoteId)) {
      return res.status(400).json({ error: 'quoteId must be an integer' });
    }

    const deleted = await quoteModel.deleteById(quoteId, userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

function formatQuote(q) {
  return {
    quoteId: q.quote_id,
    quote: q.quote,
    visibility: q.visibility,
    createdAt: q.created_at,
  };
}

module.exports = { createQuote, deleteQuote };