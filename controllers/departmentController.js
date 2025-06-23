const Department = require('../models/Department');
const Worker = require('../models/Worker');
const asyncHandler = require('express-async-handler');

const createDepartment = asyncHandler(async (req, res) => {
  const { name, subdomain } = req.body;

  // Validate input
  if (!name || name.trim().length < 2) {
    res.status(400);
    throw new Error('Department name must be at least 2 characters long');
  }

  if (!subdomain || subdomain == 'main') {
    res.status(400);
    throw new Error('Company name is missing, login again.');
  }

  try {
    const existingDepartment = await Department.findOne({ 
      name: name.trim()
    });
  
    if (existingDepartment) {
      res.status(400);
      throw new Error('Department with this name already exists.');
    }

    // Create department with exact case preservation
    const department = new Department({ name, subdomain });
    
    await department.save();
    
    // Get worker count
    const workerCount = await Worker.countDocuments({ 
      department: department._id
    });

    // Prepare response
    const departmentResponse = {
      ...department.toObject(),
      workerCount
    };

    res.status(201).json(departmentResponse);
  } catch (error) {
    console.error('Department Creation Error:', error);
    throw error;
  }
});

const getDepartments = asyncHandler(async (req, res) => {
  const { subdomain } = req.body;
  if (!subdomain || subdomain === 'main') {
    res.status(400);
    throw new Error('Subdomain is missing or invalid.');
  }

  try {
    // 1. Load all departments for this subdomain
    const departments = await Department
      .find({ subdomain })
      .sort({ createdAt: -1 });

    // 2. For each department, fetch its workers and build the response
    const departmentsWithData = await Promise.all(
      departments.map(async (department) => {
        // Find all workers in this department, selecting only name & photo
        const employees = await Worker
          .find({ department: department._id })
          .select('name photo');

        return {
          // Spread the original department fields (_id, name, createdAt, etc.)
          ...department.toObject(),
          workerCount: employees.length,
          employees  // [{ name, photo }, …]
        };
      })
    );

    // 3. Send back JSON array
    res.json(departmentsWithData);

  } catch (error) {
    console.error('Get Departments Error:', error);
    res.status(500).json({ message: 'Failed to fetch departments.' });
  }
});


const deleteDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);

  if (!department) {
    res.status(404);
    throw new Error('Department not found');
  }

  // Check for associated workers
  const workerCount = await Worker.countDocuments({ 
    department: req.params.id 
  });

  if (workerCount > 0) {
    res.status(400);
    throw new Error(`Cannot delete department. ${workerCount} workers are assigned.`);
  }

  await department.deleteOne();
  res.json({ 
    message: 'Department removed successfully',
    departmentId: req.params.id
  });
});

const updateDepartment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  // Validate input
  if (!name || name.trim().length < 2) {
    res.status(400);
    throw new Error('Department name must be at least 2 characters long');
  }

  try {
    // Check for existing department (case-insensitive)
    const existingDepartment = await Department.findOne({ 
      name: { $regex: `^${name.trim()}$`, $options: 'i' },
      _id: { $ne: id } // Exclude current department
    });

    if (existingDepartment) {
      res.status(400);
      throw new Error('A department with this name already exists');
    }

    // Find the department and update with exact case
    const department = await Department.findById(id);
    
    if (!department) {
      res.status(404);
      throw new Error('Department not found');
    }

    department.name = name.trim();
    await department.save(); // Use save() to trigger validation

    // Get worker count
    const workerCount = await Worker.countDocuments({ 
      department: department._id 
    });

    // Prepare response
    const departmentResponse = {
      ...department.toObject(),
      workerCount
    };

    res.json(departmentResponse);
  } catch (error) {
    // Handle specific errors
    if (error.code === 11000) {
      res.status(400);
      throw new Error('A department with this name already exists');
    }
    
    // Rethrow other errors
    throw error;
  }
});

module.exports = {
  createDepartment,
  getDepartments,
  deleteDepartment,
  updateDepartment
};