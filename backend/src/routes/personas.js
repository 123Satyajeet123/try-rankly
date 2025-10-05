const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Persona = require('../models/Persona');
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

// Get all personas for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const personas = await Persona.find({ userId: req.userId });
    
    res.json({
      success: true,
      data: personas
    });

  } catch (error) {
    console.error('Get personas error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get personas'
    });
  }
});

// Create new persona
router.post('/', authenticateToken, [
  body('type').trim().notEmpty(),
  body('description').trim().notEmpty()
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

    const { type, description, selected = false, source = 'user' } = req.body;

    const persona = new Persona({
      userId: req.userId,
      type,
      description,
      selected,
      source
    });

    await persona.save();

    res.status(201).json({
      success: true,
      message: 'Persona created successfully',
      data: persona
    });

  } catch (error) {
    console.error('Create persona error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create persona'
    });
  }
});

// Update persona
router.put('/:id', authenticateToken, [
  body('type').optional().trim().notEmpty(),
  body('description').optional().trim().notEmpty()
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

    const persona = await Persona.findOneAndUpdate(
      { _id: id, userId: req.userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!persona) {
      return res.status(404).json({
        success: false,
        message: 'Persona not found'
      });
    }

    res.json({
      success: true,
      message: 'Persona updated successfully',
      data: persona
    });

  } catch (error) {
    console.error('Update persona error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update persona'
    });
  }
});

// Delete persona
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const persona = await Persona.findOneAndDelete({
      _id: id,
      userId: req.userId
    });

    if (!persona) {
      return res.status(404).json({
        success: false,
        message: 'Persona not found'
      });
    }

    res.json({
      success: true,
      message: 'Persona deleted successfully'
    });

  } catch (error) {
    console.error('Delete persona error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete persona'
    });
  }
});

module.exports = router;

