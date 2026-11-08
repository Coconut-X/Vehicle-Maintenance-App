const express = require("express");
const g = require("../controllers/groupController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

//the page of the email link asks who invited, no login needed yet
//these two come first so "invites" is not read as a group id
router.get("/invites/:token", g.inviteInfo);
router.post("/invites/accept", protect, g.acceptInvite);

router.use(protect);

router.get("/", g.getGroups);
router.post("/", g.createGroup);
router.get("/:id", g.getGroup);
router.put("/:id", g.renameGroup);
router.delete("/:id", g.removeGroup);
router.post("/:id/invites", g.addInvites);
router.post("/:id/invites/:inviteId/resend", g.resendInvite);
router.delete("/:id/invites/:inviteId", g.revokeInvite);
router.delete("/:id/members/:userId", g.kickMember);
router.post("/:id/leave", g.leaveGroup);
router.put("/:id/vehicles", g.setVehicles);
router.put("/:id/notify", g.setNotify);

module.exports = router;
