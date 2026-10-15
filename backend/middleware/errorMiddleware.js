//for routes that dont exist
const notFound = (req, res, next) => {
  res.status(404).json({ message: "route not found: " + req.originalUrl });
};

//every error ends up here so the client always gets the same shape
//{ message, errors } where errors is per field and optional
const errorHandler = (err, req, res, next) => {
  //bad json in body
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "invalid json in request body" });
  }

  //mongoose schema validation
  if (err.name === "ValidationError") {
    const errors = {};
    Object.keys(err.errors).forEach((field) => {
      errors[field] = err.errors[field].message;
    });
    return res.status(422).json({ message: "validation failed", errors });
  }

  //bad object id like /vehicles/123
  if (err.name === "CastError") {
    return res.status(404).json({ message: "not found" });
  }

  //unique index clash
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({ message: field + " already exists", errors: { [field]: field + " already exists" } });
  }

  console.log(err);
  res.status(500).json({ message: "something went wrong" });
};

module.exports = { notFound, errorHandler };
