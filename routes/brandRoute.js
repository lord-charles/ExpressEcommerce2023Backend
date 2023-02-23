const router = require("express").Router();
const {
  createBrand,
  getBrand,
  getAllBrands,
  updateBrand,
  deleteBrand,
} = require("../controller/brandCtrl");
const { authMiddleware, isAdmin } = require("../middlewares/authMiddleware");

router.post("/", authMiddleware, isAdmin, createBrand);
router.put("/:id", authMiddleware, isAdmin, updateBrand);
router.delete("/:id", authMiddleware, isAdmin, deleteBrand);
router.get("/:id", getBrand);
router.get("/get/:id", getAllBrands);

module.exports = router;
