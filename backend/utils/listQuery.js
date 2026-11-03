//helpers for search and pagination on list routes

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

//query params can be arrays if sent twice so only accept plain strings
const getString = (v) => (typeof v === "string" ? v.trim() : "");

//page starts at 1, bad values fall back to defaults instead of failing
const getPaging = (query) => {
  let page = parseInt(getString(query.page), 10);
  let limit = parseInt(getString(query.limit), 10);
  if (!page || page < 1) page = 1;
  if (!limit || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;
  return { page, limit, skip: (page - 1) * limit };
};

//escape regex characters so search text cant be used as a pattern
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const pageInfo = (total, page, limit) => ({
  total,
  page,
  limit,
  pages: Math.ceil(total / limit),
});

module.exports = { getString, getPaging, escapeRegex, pageInfo };
