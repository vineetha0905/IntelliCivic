const Issue = require('../models/Issue');
const Comment = require('../models/Comment');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
const { v4: uuidv4 } = require('uuid');
const geminiService = require('../services/geminiService');

class IssueController {

  // ===============================
  // GET ALL ISSUES
  // ===============================
  async getIssues(req, res) {
    try {
      const {
        status,
        category,
        priority,
        assignedTo,
        reportedBy,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20,
        search,
        latitude,
        longitude,
        radius = 5000
      } = req.query;

      const filter = { isPublic: true };

      // Role-based filtering
      const user = req.user;
      if (user) {
        const employeeRoles = ['field-staff', 'supervisor', 'commissioner', 'employee'];
        if (employeeRoles.includes(user.role)) {
          // Field Staff: Only see complaints assigned to them in their department
          if (user.role === 'field-staff' || user.role === 'employee') {
            filter.assignedTo = user._id;
            // Filter by department
            const userDepartments = user.departments && user.departments.length > 0 
              ? user.departments 
              : (user.department ? [user.department] : []);
            
            if (!userDepartments.includes('All')) {
              filter.category = { $in: userDepartments };
            }
          }
          // Supervisor: See complaints assigned to them + escalated from field-staff
          else if (user.role === 'supervisor') {
            filter.$or = [
              { assignedTo: user._id },
              { 
                assignedRole: 'field-staff',
                status: 'escalated',
                category: { 
                  $in: user.departments && user.departments.length > 0 
                    ? (user.departments.includes('All') ? [] : user.departments)
                    : (user.department && user.department !== 'All' ? [user.department] : [])
                }
              }
            ];
            
            // Filter by department if not 'All'
            const userDepartments = user.departments && user.departments.length > 0 
              ? user.departments 
              : (user.department ? [user.department] : []);
            
            if (!userDepartments.includes('All') && userDepartments.length > 0) {
              if (filter.$or) {
                filter.$or = filter.$or.map(condition => {
                  if (condition.category) {
                    condition.category = { $in: userDepartments };
                  }
                  return condition;
                });
              } else {
                filter.category = { $in: userDepartments };
              }
            }
          }
          // Commissioner: See ALL complaints from ALL departments
          else if (user.role === 'commissioner') {
            // No additional filtering - can see everything
          }
        }
      }

      if (status && status !== 'all') filter.status = status;
      if (category && !filter.category) filter.category = category;
      if (priority) filter.priority = priority;
      if (assignedTo && !filter.assignedTo) filter.assignedTo = assignedTo;
      if (reportedBy) filter.reportedBy = reportedBy;

      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { 'location.name': { $regex: search, $options: 'i' } }
        ];
      }

      if (latitude && longitude) {
        filter['location.coordinates'] = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(longitude), parseFloat(latitude)]
            },
            $maxDistance: parseInt(radius)
          }
        };
      }

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const issues = await Issue.find(filter)
        .populate('reportedBy', 'name email profileImage')
        .populate('assignedTo', 'name email profileImage')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Issue.countDocuments(filter);

      res.json({
        success: true,
        data: {
          issues,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: limit
          }
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ===============================
  // GET LEADERBOARD
  // ===============================
  async getLeaderboard(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const currentUserId = req.user?._id?.toString();
      
      // Get top users by points (citizens only)
      // Ensure points field is treated as 0 if null/undefined, and sort by points descending
      const topUsers = await User.find({ 
        role: 'citizen',
        name: { $exists: true, $ne: null }
      })
        .select('name points')
        .sort({ points: -1 })
        .limit(limit)
        .lean();
      
      // Calculate current user's rank and get their data
      let currentUserData = null;
      if (currentUserId) {
        const currentUser = await User.findById(currentUserId)
          .select('name points')
          .lean();
        
        if (currentUser) {
          // Count how many users have more points than current user
          const usersAbove = await User.countDocuments({
            role: 'citizen',
            points: { $gt: currentUser.points || 0 }
          });
          const userRank = usersAbove + 1;
          
          currentUserData = {
            rank: userRank,
            name: currentUser.name,
            points: currentUser.points || 0,
            isCurrentUser: true
          };
        }
      }
      
      // Format response with rank - show ONLY top 10
      // Ensure points are treated as 0 if null/undefined
      const formatted = topUsers.map((user, index) => {
        const userRank = index + 1;
        const userPoints = (user.points !== null && user.points !== undefined) ? user.points : 0;
        return {
          rank: userRank,
          name: user.name || 'Unknown',
          points: userPoints,
          isCurrentUser: currentUserId && user._id.toString() === currentUserId
        };
      });
      
      res.json({
        success: true,
        data: {
          leaderboard: formatted,
          currentUser: currentUserData
        }
      });
    } catch (error) {
      console.error('Get leaderboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching leaderboard',
        error: error.message
      });
    }
  }

  // ===============================
  // CLOSE ISSUE (Citizen acknowledges resolution)
  // ===============================
  async closeIssue(req, res) {
    try {
      const { id } = req.params;
      const issue = await Issue.findById(id);
      
      if (!issue) {
        return res.status(404).json({
          success: false,
          message: 'Issue not found'
        });
      }

      // Only the reporter can close their own resolved issue
      if (issue.reportedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Only the reporter can close this issue'
        });
      }

      // Only resolved issues can be closed
      if (issue.status !== 'resolved') {
        return res.status(400).json({
          success: false,
          message: 'Only resolved issues can be closed'
        });
      }

      // Update status to closed and set closedAt timestamp
      issue.status = 'closed';
      issue.closedAt = new Date();
      await issue.save();

      // Award 10 points to reporter for Confirmed Resolution (close)
      if (req.user && req.user.role === 'citizen') {
        req.user.points = (req.user.points || 0) + 10;
        await req.user.save();
      }

      // Delete the issue after it's been closed
      await issue.deleteOne();
      console.log(`Issue ${issue._id} closed and deleted by citizen ${req.user._id}`);

      return res.json({
        success: true,
        message: 'Issue closed successfully',
        data: { deleted: true }
      });
    } catch (error) {
      console.error('Close issue error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error closing issue',
        error: error.message
      });
    }
  }

  // ===============================
  // GET ISSUES FOR A SPECIFIC USER
  // ===============================
  async getUserIssues(req, res) {
    try {
      const { userId } = req.params;
      const {
        status,
        page = 1,
        limit = 20
      } = req.query;

      // Only allow a user to see their own issues, or admins to see anyone's
      if (req.user.role !== 'admin' && req.user._id.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view these issues'
        });
      }

      const filter = { reportedBy: userId };
      if (status && status !== 'all') {
        filter.status = status;
      }

      const skip = (page - 1) * limit;

      const issues = await Issue.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10));

      const total = await Issue.countDocuments(filter);

      return res.json({
        success: true,
        data: {
          issues,
          pagination: {
            currentPage: Number(page),
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: Number(limit)
          }
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // ===============================
  // GET SINGLE ISSUE
  // ===============================
  async getIssue(req, res) {
    try {
      const issue = await Issue.findById(req.params.id)
        .populate('reportedBy', 'name email profileImage')
        .populate('assignedTo', 'name email profileImage');

      if (!issue) {
        return res.status(404).json({ success: false, message: 'Issue not found' });
      }

      res.json({ success: true, data: { issue } });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ===============================
  // CREATE ISSUE (ML INTEGRATED)
  // ===============================
  async createIssue(req, res) {
    try {
      const {
        title,
        description,
        location,
        tags = [],
        isAnonymous = false
      } = req.body;

      // ---------- ML VALIDATION (NON-BLOCKING - OPTIONAL FOR CATEGORY DETECTION) ----------
      let category = req.body.category || 'Other'; // Use provided category or default
      let priority = req.body.priority || 'medium'; // Use provided priority or default
      let mlResult = null;
      
      // Generate reportId for tracking (used for dataset removal when resolved)
      const reportId = uuidv4();

      // ML validation is now strict. If it fails to verify or classify, the report is rejected.
      if (process.env.ML_API_URL) {
        try {
          const coords = location?.coordinates;
          const latitude = Array.isArray(coords) ? coords[0] : coords?.latitude || null;
          const longitude = Array.isArray(coords) ? coords[1] : coords?.longitude || null;

          // Get image URL from request if available
          let imageUrl = req.body.imageUrl || null;
          if (!imageUrl && req.body.images && Array.isArray(req.body.images) && req.body.images.length > 0) {
            imageUrl = req.body.images[0].url || null;
          }

          // Build multipart form data to call Python ML backend
          const formData = new FormData();
          formData.append('report_id', reportId);
          formData.append('description', description);
          formData.append('user_id', req.user._id.toString());
          if (latitude !== null && latitude !== undefined) {
            formData.append('latitude', latitude.toString());
          }
          if (longitude !== null && longitude !== undefined) {
            formData.append('longitude', longitude.toString());
          }
          if (category) {
            formData.append('category', category);
          }
          if (title) {
            formData.append('title', title);
          }

          if (imageUrl) {
            try {
              const imageResponse = await fetch(imageUrl);
              if (imageResponse.ok) {
                const imageBlob = await imageResponse.blob();
                formData.append('image', imageBlob, 'image.jpg');
              } else {
                console.error('Failed to fetch image from Cloudinary:', imageResponse.statusText);
                return res.status(400).json({
                  success: false,
                  message: 'Unable to verify uploaded image.'
                });
              }
            } catch (imgFetchErr) {
              console.error('Error fetching image from Cloudinary:', imgFetchErr.message);
              return res.status(400).json({
                success: false,
                message: 'Unable to verify uploaded image.'
              });
            }
          }

          // Set a timeout for ML validation (45 seconds)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('ML_TIMEOUT')), 45000)
          );

          try {
            const mlResponse = await Promise.race([
              fetch(process.env.ML_API_URL, {
                method: 'POST',
                body: formData // Node fetch automatically sets multipart headers and boundary
              }),
              timeoutPromise
            ]);

            if (mlResponse.ok) {
              const parsed = await mlResponse.json();
              mlResult = parsed;

              // Reject if ML explicitly rejects the report
              if (mlResult && mlResult.accept === false && mlResult.status === 'rejected') {
                const reason = mlResult.reason || 'Report rejected by validator';
                
                // Deduct points from user for rejected report
                if (req.user && req.user._id) {
                  try {
                    const reporter = await User.findById(req.user._id);
                    if (reporter) {
                      const currentPoints = reporter.points || 0;
                      reporter.points = Math.max(0, currentPoints - 5);
                      await reporter.save();
                      console.log(`Deducted -5 points from user ${reporter._id} for rejected report. New total: ${reporter.points}`);
                    }
                  } catch (pointsError) {
                    console.error('Error deducting points:', pointsError);
                  }
                }
                
                return res.status(400).json({
                  success: false,
                  accepted: false,
                  message: 'Validation Error',
                  reason: reason,
                  validation: mlResult.validation || (reason.includes('match') ? 'category_mismatch' : undefined)
                });
              }

              // Use ML-detected category if available
              if (mlResult && mlResult.category) {
                category = mlResult.category;
              }

              // Use ML-detected priority if available
              if (mlResult && mlResult.urgency) {
                priority = mlResult.urgency;
              }
            } else {
              console.error('ML service returned non-ok response:', mlResponse.status);
              return res.status(400).json({
                success: false,
                message: 'Unable to verify uploaded image.'
              });
            }
          } catch (fetchError) {
            console.error('ML validation fetch error:', fetchError.message);
            return res.status(400).json({
              success: false,
              message: 'Unable to verify uploaded image.'
            });
          }
        } catch (mlError) {
          console.error('ML validation outer error:', mlError.message);
          return res.status(400).json({
            success: false,
            message: 'Unable to verify uploaded image.'
          });
        }
      } else {
        // If ML API is required in env but not present, fallback
        console.log('ML_API_URL not configured');
      }

      // ---------- IMAGE NORMALIZATION ----------
      let images = [];
      try {
        const parsed = typeof req.body.images === 'string'
          ? JSON.parse(req.body.images)
          : req.body.images;

        if (Array.isArray(parsed)) {
          images = parsed
            .map(img => {
              if (typeof img === 'string') return { url: img };
              const url = img.url || img.secure_url;
              return url ? { url, caption: img.caption } : null;
            })
            .filter(Boolean);
        }
      } catch (_) {}

      if ((!images || images.length === 0) && req.body.imageUrl) {
        images = [{ url: req.body.imageUrl, caption: 'Issue image' }];
      }

      if ((!images || images.length === 0) && req.files?.images) {
        images = req.files.images;
      }

      // ---------- SAVE ISSUE ----------
      // Map priority to valid enum values: ['low', 'medium', 'high', 'urgent']
      // Priority is already set above from ML result or default
      const priorityMap = {
        'normal': 'medium',
        'urgent': 'urgent',
        'high': 'high',
        'medium': 'medium',
        'low': 'low'
      };
      const finalPriority = priorityMap[priority?.toLowerCase()] || 'medium';
      
      // Map category to Mongoose DB enum values
      const dbCategoryMap = {
        'Road & Traffic': 'Road Damage',
        'Road Damage': 'Road Damage',
        'Traffic Issue': 'Traffic Issue',
        'Water & Drainage': 'Water Leakage',
        'Water Leakage': 'Water Leakage',
        'Drainage Issue': 'Drainage Issue',
        'Garbage & Sanitation': 'Garbage & Sanitation',
        'Street Lighting': 'Streetlight Failure',
        'Streetlight Failure': 'Streetlight Failure',
        'Electricity': 'Public Infrastructure',
        'Parks & Recreation': 'Public Infrastructure',
        'Public Infrastructure': 'Public Infrastructure',
        'Public Safety': 'Environmental Hazard',
        'Environmental Hazard': 'Environmental Hazard',
        'Other': 'Other'
      };
      const finalCategory = dbCategoryMap[category] || 'Other';

      const issue = new Issue({
        title,
        description,
        category: finalCategory, // Use mapped category
        location,
        priority: finalPriority,
        tags,
        isAnonymous,
        reportedBy: req.user._id,
        images,
        documents: req.files?.documents || [],
        status: 'reported', // Explicitly set status to 'reported' - must stay 'reported' until employee accepts
        reportId: reportId || null, // Store report_id for ML dataset removal
        aiAnalysis: req.body.aiAnalysis || null
      });

      await issue.save();

      // Award 10 points to citizen for reporting
      if (req.user && req.user.role === 'citizen') {
        req.user.points = (req.user.points || 0) + 10;
        await req.user.save();
      }

      await issue.populate('reportedBy', 'name email profileImage');

      // AUTO-ASSIGN TO DEPARTMENT: Automatically assign issue to all employees in the department
      try {
        const issueCategory = finalCategory;
        
        // Find all active employees with matching department
        const employeeRoles = ['field-staff', 'supervisor', 'commissioner', 'employee'];
        const departmentEmployees = await User.find({
          role: { $in: employeeRoles },
          isActive: true,
          $or: [
            { departments: { $in: [issueCategory, 'All'] } },
            { department: { $in: [issueCategory, 'All'] } }
          ]
        });

        if (departmentEmployees.length > 0) {
          // Assign to department (not a specific user) - this allows all employees in department to see it
          const assignedRole = 'field-staff';
          
          // Set assignedRole, but leave assignedTo as null and status MUST remain 'reported'
          // CRITICAL: Status must stay 'reported' - only employee acceptance can change it to 'in-progress'
          issue.assignedRole = assignedRole;
          issue.assignedBy = req.user._id; // Admin or system
          issue.assignedAt = new Date();
          // DO NOT change status - keep it as 'reported'
          issue.status = 'reported'; // Ensure status is 'reported' - employees must accept to change to 'in-progress'
          
          // Calculate escalation deadline based on priority and role
          if (issue.priority) {
            const deadline = issue.calculateEscalationDeadline(issue.priority, assignedRole);
            issue.escalationDeadline = deadline;
          }
          
          await issue.save();

          // Notify ONLY field-staff employees (not supervisors or commissioners yet)
          // Supervisors and commissioners will be notified when issue escalates
          const fieldStaffOnly = departmentEmployees.filter(emp => 
            emp.role === 'field-staff' || emp.role === 'employee'
          );
          const notificationPromises = fieldStaffOnly.map(emp => 
            notificationService.notifyIssueAssignment(issue, emp, req.user)
          );
          await Promise.all(notificationPromises);
          
          console.log(`✅ Issue auto-assigned to field-staff in department "${issueCategory}". ${fieldStaffOnly.length} field-staff notified.`);
        } else {
          // No employees found for this department - issue remains unassigned
          // Admins can manually assign it later
          console.log(`⚠️ No active employees found for department "${issueCategory}". Issue will remain unassigned.`);
        }
      } catch (assignError) {
        // Don't fail issue creation if auto-assignment fails
        console.error('Auto-assignment error (non-blocking):', assignError.message);
      }

      await notificationService.notifyAdminsNewIssue(issue, req.user);

      res.status(201).json({
        success: true,
        message: 'Issue created successfully',
        data: { issue, ml: mlResult }
      });

    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ===============================
  // UPDATE ISSUE
  // ===============================
  async updateIssue(req, res) {
    try {
      const issue = await Issue.findById(req.params.id);
      if (!issue) return res.status(404).json({ success: false });

      if (req.user.role !== 'admin' &&
          issue.reportedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false });
      }

      // STRICT RULE: Prevent changing status to 'in-progress' via updateIssue
      // Only employee acceptance can change status from 'reported' to 'in-progress'
      if (req.body.status === 'in-progress' && req.user.role !== 'employee') {
        return res.status(403).json({ 
          success: false,
          message: 'Status cannot be set to in-progress via update. Only employees can accept issues to change status to in-progress.'
        });
      }

      Object.assign(issue, req.body);
      await issue.save();

      res.json({ success: true, data: { issue } });
    } catch (error) {
      res.status(500).json({ success: false });
    }
  }

  // ===============================
  // DELETE ISSUE
  // ===============================
  async deleteIssue(req, res) {
    try {
      const issue = await Issue.findById(req.params.id);
      if (!issue) return res.status(404).json({ success: false });

      await issue.deleteOne();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false });
    }
  }

  // ===============================
  // UPVOTE ISSUE
  // ===============================
  async upvoteIssue(req, res) {
    try {
      const issue = await Issue.findById(req.params.id);
      if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

      const alreadyUpvoted = issue.upvotedBy.includes(req.user._id);
      if (!alreadyUpvoted) {
        await issue.upvote(req.user._id);

        if (req.user && req.user.role === 'citizen') {
          req.user.points = (req.user.points || 0) + 3;
          await req.user.save();
        }
      }
      res.json({ success: true, upvotes: issue.upvotes });
    } catch (error) {
      res.status(500).json({ success: false });
    }
  }

  async removeUpvote(req, res) {
    try {
      const issue = await Issue.findById(req.params.id);
      await issue.removeUpvote(req.user._id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false });
    }
  }

  // ===============================
  // COMMENTS
  // ===============================
  async getIssueComments(req, res) {
    try {
      const comments = await Comment.getIssueComments(req.params.id);
      res.json({ success: true, data: comments });
    } catch (error) {
      res.status(500).json({ success: false });
    }
  }

  async addComment(req, res) {
    try {
      const comment = new Comment({
        issue: req.params.id,
        author: req.user._id,
        content: req.body.content
      });
      await comment.save();
      res.status(201).json({ success: true, data: comment });
    } catch (error) {
      res.status(500).json({ success: false });
    }
  }

  // ===============================
  // GEMINI & ADVANCED CIVIC INTELLIGENCE
  // ===============================
  
  async analyzeIssueText(req, res) {
    try {
      const { description, imageBase64 } = req.body;
      if (!description || !description.trim()) {
        return res.status(400).json({ success: false, message: 'Description is required' });
      }

      const result = await geminiService.analyzeIssue(description, imageBase64);
      if (result && result.is_abusive) {
        return res.status(400).json({
          success: false,
          accepted: false,
          reason: 'Abusive language detected.',
          validation: 'profanity_detected'
        });
      }
      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('analyzeIssueText error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async checkDuplicateIssue(req, res) {
    try {
      const { description, category, coordinates, locationName, imageBase64 } = req.body;
      if (!description || !coordinates || !coordinates.latitude || !coordinates.longitude) {
        return res.status(400).json({ success: false, message: 'Description and coordinates are required' });
      }

      // Bounding box approximation for 500 meters (~0.0045 degrees)
      const lat = parseFloat(coordinates.latitude);
      const lng = parseFloat(coordinates.longitude);
      const latDelta = 0.0045;
      const lngDelta = 0.0045;

      // Query database for unresolved issues in the same category within the bounding box
      const nearbyIssues = await Issue.find({
        category,
        status: { $in: ['reported', 'assigned', 'accepted', 'in-progress', 'escalated'] },
        'location.coordinates.latitude': { $gte: lat - latDelta, $lte: lat + latDelta },
        'location.coordinates.longitude': { $gte: lng - lngDelta, $lte: lng + lngDelta }
      }).limit(5).lean();

      // Run duplicate detection through Gemini
      const result = await geminiService.checkDuplicate(
        { description, category, locationName, coordinates, imageBase64 },
        nearbyIssues
      );

      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('checkDuplicateIssue error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async verifyIssue(req, res) {
    try {
      const { id } = req.params;
      const { status, comment, evidenceUrl } = req.body;

      if (!['verified', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Status must be verified or rejected' });
      }

      const issue = await Issue.findById(id);
      if (!issue) {
        return res.status(404).json({ success: false, message: 'Issue not found' });
      }

      // Calculate weight based on user trust / role
      const weight = req.user.role === 'admin' ? 5.0 :
                     ['employee', 'field-staff', 'supervisor', 'commissioner'].includes(req.user.role) ? 2.5 :
                     req.user.isVerified ? 1.5 : 1.0;

      const existingVoteIndex = issue.verifications.findIndex(v => v.user.toString() === req.user._id.toString());
      const voteData = {
        user: req.user._id,
        status,
        comment,
        evidenceUrl,
        confidenceScore: weight,
        createdAt: new Date()
      };

      let awardedPoints = false;
      if (existingVoteIndex > -1) {
        issue.verifications[existingVoteIndex] = voteData;
      } else {
        issue.verifications.push(voteData);
        // Award 5 points to user for verifying
        if (req.user && req.user.role === 'citizen') {
          req.user.points = (req.user.points || 0) + 5;
          await req.user.save();
          awardedPoints = true;
        }
      }

      // Async/Inline summary update using Gemini
      const comments = await Comment.find({ issue: id, isDeleted: false }).lean();
      
      // Map verifications details for summarizer
      const verificationsSummaryData = issue.verifications.map(v => ({
        userRole: req.user.role,
        status: v.status,
        comment: v.comment
      }));

      try {
        const consensus = await geminiService.summarizeCommunityFeedback(comments, verificationsSummaryData);
        
        issue.verificationSummary = {
          status: consensus.verification_status,
          summary: consensus.community_summary,
          confidenceScore: consensus.confidence_score,
          updatedAt: new Date()
        };
      } catch (sumError) {
        console.error('Gemini verification summarization error (non-blocking):', sumError);
      }

      await issue.save();

      // Check if verification summary confidence score is high (>= 80) and awards "Community Validation" points (+5 points to reporter and verifiers)
      if (issue.verificationSummary?.confidenceScore >= 80 && !issue.pointsAwarded) {
        // Trigger bonus reward for community validation once
        try {
          const reporter = await User.findById(issue.reportedBy);
          if (reporter && reporter.role === 'citizen') {
            reporter.points = (reporter.points || 0) + 5;
            await reporter.save();
          }
        } catch (e) {
          console.error('Bonus points award failed:', e);
        }
      }

      return res.json({
        success: true,
        message: 'Verification recorded successfully',
        data: {
          verifications: issue.verifications,
          summary: issue.verificationSummary,
          pointsAwarded: awardedPoints ? 5 : 0
        }
      });
    } catch (error) {
      console.error('verifyIssue error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async getCivicInsights(req, res) {
    try {
      // Pull recent issues (e.g. last 100 issues)
      const issues = await Issue.find({ isPublic: true })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      const insights = await geminiService.generateCivicInsights(issues);
      return res.json({ success: true, data: insights });
    } catch (error) {
      console.error('getCivicInsights error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async getPredictiveInsights(req, res) {
    try {
      const issues = await Issue.find({ isPublic: true })
        .sort({ createdAt: -1 })
        .limit(150)
        .lean();

      const predictive = await geminiService.generatePredictiveInsights(issues);
      return res.json({ success: true, data: predictive });
    } catch (error) {
      console.error('getPredictiveInsights error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async getExecutiveGovernance(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
      }

      const issues = await Issue.find().sort({ createdAt: -1 }).limit(100).lean();
      
      // Calculate overall stats
      const userCount = await User.countDocuments({ role: 'citizen' });
      const activeUserCount = await User.countDocuments({ role: 'citizen', isActive: true });
      const userStats = {
        totalCitizens: userCount,
        activeCitizens: activeUserCount,
        citizenEngagementRate: userCount > 0 ? Math.round((activeUserCount / userCount) * 100) : 0
      };

      const governance = await geminiService.generateExecutiveGovernance(issues, userStats);
      return res.json({ success: true, data: governance });
    } catch (error) {
      console.error('getExecutiveGovernance error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new IssueController();

