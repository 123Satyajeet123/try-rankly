const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Topic = require('../models/Topic');
const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Get all topics for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const topics = await Topic.find({ userId: req.userId });
    
    res.json({
      success: true,
      data: topics
    });

  } catch (error) {
    console.error('Get topics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get topics'
    });
  }
});

// Create new topic
router.post('/', authenticateToken, [
  body('name').trim().notEmpty(),
  body('keywords').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, keywords = [], selected = false, source = 'user' } = req.body;

    const topic = new Topic({
      userId: req.userId,
      name,
      keywords,
      selected,
      source
    });

    await topic.save();

    res.status(201).json({
      success: true,
      message: 'Topic created successfully',
      data: topic
    });

  } catch (error) {
    console.error('Create topic error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create topic'
    });
  }
});

// Update topic
router.put('/:id', authenticateToken, [
  body('name').optional().trim().notEmpty(),
  body('keywords').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updates = req.body;

    const topic = await Topic.findOneAndUpdate(
      { _id: id, userId: req.userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found'
      });
    }

    res.json({
      success: true,
      message: 'Topic updated successfully',
      data: topic
    });

  } catch (error) {
    console.error('Update topic error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update topic'
    });
  }
});

// Delete topic
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const topic = await Topic.findOneAndDelete({
      _id: id,
      userId: req.userId
    });

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found'
      });
    }

    res.json({
      success: true,
      message: 'Topic deleted successfully'
    });

  } catch (error) {
    console.error('Delete topic error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete topic'
    });
  }
});

module.exports = router;

