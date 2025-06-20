const express = require("express");
const router = express.Router();
const userAlbumController = require("../controllers/userAlbumController");
const { verifyToken } = require("../middlewares/authMiddleware");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get("/", verifyToken, userAlbumController.getAllUserAlbums);
router.get("/all", userAlbumController.getAllAlbums);
router.get("/:id", verifyToken, userAlbumController.getUserAlbumById);
router.post("/", verifyToken, userAlbumController.createUserAlbum);
router.put("/:id", verifyToken, userAlbumController.updateUserAlbum);
router.delete("/:id", verifyToken, userAlbumController.deleteUserAlbum);

module.exports = router;
