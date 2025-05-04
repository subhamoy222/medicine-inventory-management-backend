// Get returnable quantities for medicines by party
router.get('/returnable-quantities', async (req, res) => {
  try {
    const { email, partyName } = req.query;

    if (!email || !partyName) {
      return res.status(400).json({ message: 'Email and party name are required' });
    }

    // Get all sale bills for the party
    const saleBills = await SaleBill.find({
      email,
      partyName
    });

    // Get all return bills for the party
    const returnBills = await ReturnBill.find({
      email,
      customerName: partyName
    });

    // Create a map to store total sold quantities
    const soldMap = new Map();
    saleBills.forEach(bill => {
      bill.items.forEach(item => {
        const key = `${item.itemName.toLowerCase()}-${item.batch}`;
        const currentQuantity = soldMap.get(key) || 0;
        soldMap.set(key, currentQuantity + (parseInt(item.quantity) || 0));
      });
    });

    // Create a map to store total returned quantities
    const returnedMap = new Map();
    returnBills.forEach(bill => {
      bill.items.forEach(item => {
        const key = `${item.itemName.toLowerCase()}-${item.batch}`;
        const currentQuantity = returnedMap.get(key) || 0;
        returnedMap.set(key, currentQuantity + (parseInt(item.quantity) || 0));
      });
    });

    // Calculate returnable quantities
    const returnableQuantities = [];
    soldMap.forEach((soldQuantity, key) => {
      const [itemName, batch] = key.split('-');
      const returnedQuantity = returnedMap.get(key) || 0;
      const returnableQuantity = soldQuantity - returnedQuantity;

      if (returnableQuantity > 0) {
        returnableQuantities.push({
          itemName,
          batch,
          soldQuantity,
          returnedQuantity,
          returnableQuantity
        });
      }
    });

    res.json(returnableQuantities);
  } catch (error) {
    console.error('Error getting returnable quantities:', error);
    res.status(500).json({ message: 'Error getting returnable quantities' });
  }
}); 