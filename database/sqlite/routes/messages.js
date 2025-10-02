const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Agent = require('../models/Agent');
const authMiddleware = require('../middleware/auth');

/**
 * POST /api/messages/send
 * Send a message (direct or broadcast)
 */
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const { fromCode, toCode, toTeamId, content, type, priority } = req.body;
    
    // Validate required fields
    if (!fromCode || !content || !type) {
      return res.status(400).json({
        success: false,
        error: 'fromCode, content, and type are required'
      });
    }
    
    // Validate message type
    if (!['direct', 'broadcast'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'type must be either "direct" or "broadcast"'
      });
    }
    
    // Validate recipients
    if (type === 'direct' && !toCode) {
      return res.status(400).json({
        success: false,
        error: 'toCode is required for direct messages'
      });
    }
    
    if (type === 'broadcast' && !toTeamId) {
      return res.status(400).json({
        success: false,
        error: 'toTeamId is required for broadcast messages'
      });
    }
    
    // Create message
    const messageData = {
      fromCode: fromCode.toUpperCase(),
      content: content.trim(),
      type: type,
      priority: priority || 'normal',
      timestamp: new Date(),
      isRead: false
    };
    
    if (type === 'direct') {
      messageData.toCode = toCode.toUpperCase();
    } else {
      messageData.toTeamId = parseInt(toTeamId);
    }
    
    const message = await Message.create(messageData);
    
    res.json({
      success: true,
      data: {
        messageId: message._id,
        fromCode: message.fromCode,
        type: message.type,
        timestamp: message.timestamp,
        ...(message.toCode && { toCode: message.toCode }),
        ...(message.toTeamId && { toTeamId: message.toTeamId })
      }
    });
    
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

/**
 * GET /api/messages/agent/:agentCode
 * Get messages for an agent
 */
router.get('/agent/:agentCode', authMiddleware, async (req, res) => {
  try {
    const { agentCode } = req.params;
    const { limit = 50, unreadOnly = false } = req.query;
    
    // Get agent info for team
    const agent = await Agent.findByCode(agentCode.toUpperCase());
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }
    
    // Build query
    const query = {
      $or: [
        { toCode: agentCode.toUpperCase() },
        { toTeamId: agent.team_id }
      ]
    };
    
    if (unreadOnly === 'true') {
      query.isRead = false;
    }
    
    const messages = await Message.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json({
      success: true,
      agentCode: agentCode.toUpperCase(),
      messages: messages,
      count: messages.length
    });
    
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get messages'
    });
  }
});

/**
 * PUT /api/messages/:messageId/read
 * Mark message as read
 */
router.put('/:messageId/read', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findByIdAndUpdate(
      messageId,
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        messageId: message._id,
        isRead: message.isRead,
        readAt: message.readAt
      }
    });
    
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark message as read'
    });
  }
});

module.exports = router;