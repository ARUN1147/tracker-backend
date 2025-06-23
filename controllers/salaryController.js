const asyncHandler = require('express-async-handler');
const Worker = require('../models/Worker');

const giveBonus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;

    if (!amount || isNaN(amount)) {
        return res.status(400).json({ message: 'Bonus amount must be a valid number' });
    }

    const worker = await Worker.findById(id);
    if (!worker) {
        return res.status(404).json({ message: 'Worker not found' });
    }

    worker.finalSalary += Number(amount);
    await worker.save();
    res.status(200).json({ message: 'Bonus added successfully', worker });
});

const resetSalary = asyncHandler(async (req, res) => {
    const { subdomain } = req.body;

    if (!subdomain) {
        return res.status(400).json({ message: 'Subdomain is required' });
    }

    const workers = await Worker.find({ subdomain });

    if (workers.length === 0) {
        return res.status(404).json({ message: 'No workers found for this subdomain' });
    }

    const updatePromises = workers.map(worker => {
        worker.finalSalary = worker.salary;
        return worker.save();
    });

    await Promise.all(updatePromises);

    res.status(200).json({ message: 'Salaries reset successfully', updatedCount: workers.length });
});

module.exports = {
    giveBonus,
    resetSalary
};
