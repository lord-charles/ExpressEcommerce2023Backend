const User = require("../models/userModel");
const Product = require("../models/products");
const asyncHandler = require("express-async-handler");
const slugify = require("slugify");
const validateMongodbId = require("../utils/validateMongodbId");

const createProduct = asyncHandler(async (req, res) => {
  if (req.body.title) {
    req.body.slug = slugify(`${req.body.title}${Date.now()}`);
  }
  let newProduct = await Product.create(req.body);
  res.status(200).json(newProduct);
});

const getAllProduct = asyncHandler(async (req, res) => {
  // Filtering
  const queryObj = { ...req.query };
  const excludeFields = ["page", "sort", "limit", "fields"];
  excludeFields.forEach((el) => delete queryObj[el]);
  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

  let query = Product.find(JSON.parse(queryStr))
    .populate("ratings.postedby")
    .populate("category")
    .populate("brand")
    .populate("colors");

  // Sorting
  const sortBy = req.query.sort
    ? req.query.sort.split(",").join(" ")
    : "-createdAt";
  query = query.sort(sortBy);

  // Limiting the fields
  const fields = req.query.fields
    ? req.query.fields.split(",").join(" ")
    : "-__v";
  query = query.select(fields);

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  query = query.skip(skip).limit(limit);

  // Get total count of products
  const totalProducts = await Product.countDocuments();

  // Return products
  const products = await query;

  // Send response
  res.status(200).json({
    success: true,
    data: products,
    page,
    limit,
    totalProducts,
  });
});

const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongodbId(id);
  if (req.body.title) {
    req.body.slug = slugify(req.body.title);
  }
  const updateProduct = await Product.findOneAndUpdate({ id }, req.body, {
    new: true,
  });
  res.status(200).json(updateProduct);
});

const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongodbId(id);
  await Product.findByIdAndRemove(id);
  res.status(200).json({ message: "Product deleted successfully" });
});

const getaProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongodbId(id);
  const findProduct = await Product.findById(id)
    .populate("ratings.postedby")
    .populate("category")
    .populate("brand")
    .populate("colors");
  res.status(200).json(findProduct);
});

// AI CHECKED
const addToWishlist = asyncHandler(async (req, res) => {
  // Get the userId from the authenticated user's request
  const { userId } = req.user;
  // Get the productId from the request body
  const { prodId } = req.body;
  validateMongodbId(prodId, userId);
  // Find the user by userId
  const user = await User.findById(userId);
  // Check if the product is already added to the wishlist
  const alreadyAdded = user.wishlist.includes(prodId);
  if (alreadyAdded) {
    // If the product is already added, remove it from the wishlist
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $pull: { wishlist: prodId },
      },
      {
        new: true, // Return the updated document
      }
    );
    res.json(updatedUser);
  } else {
    // If the product is not already added, add it to the wishlist
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $push: { wishlist: prodId },
      },
      {
        new: true, // Return the updated document
      }
    );
    res.json(updatedUser);
  }
});

const rating = asyncHandler(async (req, res) => {
  // Extract `userId`, `star`, `prodId`, and `comment` from `req`
  const { userId } = req.user;
  const { star, prodId, comment } = req.body;
  // Find the product by ID and update the rating if the user has already rated it
  let { value: updatedProduct } =
    (await Product.findOneAndUpdate(
      { _id: prodId, "ratings.postedby": userId },
      { $set: { "ratings.$": { star, comment, postedby: userId } } },
      { returnOriginal: false }
    )) || {};
  // If the user has not already rated the product, add a new rating
  if (!updatedProduct) {
    await Product.updateOne(
      { _id: prodId },
      { $push: { ratings: { star, comment, postedby: userId } } }
    );
    updatedProduct = await Product.findById(prodId);
  }
  // Calculate the average rating for the product
  const totalRating = updatedProduct.ratings.length;
  const ratingSum = updatedProduct.ratings.reduce(
    (sum, rating) => sum + rating.star,
    0
  );
  const averageRating = Math.round(ratingSum / totalRating);
  // Update the product's `totalrating` field with the average rating
  const finalProduct = await Product.findByIdAndUpdate(
    prodId,
    { totalrating: averageRating },
    { new: true }
  );
  // Send the updated product as a JSON response
  res.json(finalProduct);
});

//get productCount
const getProductCount = asyncHandler(async (req, res) => {
  const productsCount = await Product.countDocuments();
  if (!productsCount) {
    return res.status(404).send("Invalid product count!");
  }
  return res.status(200).send({ productsCount });
});

//get isfeatured
const isFeatured = asyncHandler(async (req, res) => {
  const count = req.params.count ? parseInt(req.params.count) : 0;
  const isFeatured = await Product.find({ isFeatured: true }).limit(count);
  if (!isFeatured) {
    return res.status(404).send("No featured product found!");
  }
  return res.status(200).send(isFeatured);
});

module.exports = {
  createProduct,
  getaProduct,
  getAllProduct,
  updateProduct,
  deleteProduct,
  addToWishlist,
  rating,
  getProductCount,
  isFeatured,
};
