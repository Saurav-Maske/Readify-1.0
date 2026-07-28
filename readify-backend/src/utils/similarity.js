// ---------------------------------------------------------------------------
// Cosine similarity over sparse vectors, represented as plain JS objects of
// { term: weight }. Used by tasteModel/feedModel to compare a user's taste
// vector against a book's vector (feed ranking, trending books) or two
// users' vectors against each other (suggested connections).
//
// Vectors are sparse (only non-zero terms are stored), so we only need to
// iterate the smaller vector's keys to compute the dot product - terms
// missing from the other vector contribute 0 either way.
// ---------------------------------------------------------------------------
function magnitude(vector) {
  let sumOfSquares = 0;
  for (const key in vector) {
    sumOfSquares += vector[key] * vector[key];
  }
  return Math.sqrt(sumOfSquares);
}

function cosineSimilarity(vectorA, vectorB) {
  if (!vectorA || !vectorB) return 0;

  const aKeys = Object.keys(vectorA);
  const bKeys = Object.keys(vectorB);
  if (aKeys.length === 0 || bKeys.length === 0) return 0;

  const [smaller, larger] = aKeys.length <= bKeys.length ? [vectorA, vectorB] : [vectorB, vectorA];

  let dotProduct = 0;
  for (const term in smaller) {
    if (larger[term]) {
      dotProduct += smaller[term] * larger[term];
    }
  }

  const denominator = magnitude(vectorA) * magnitude(vectorB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

module.exports = { cosineSimilarity };