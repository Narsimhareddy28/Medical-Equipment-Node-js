function calculateNextAvailableDate(equipmentId, orders) {
    const today = new Date();
    const ordersForEquipment = orders.filter(order => order.equipment_id === equipmentId && new Date(order.end_date) >= today);

    if (ordersForEquipment.length === 0) {
      return 'N/A';
    }

    // Find the latest order's end date
    const latestEndDate = new Date(Math.max(...ordersForEquipment.map(order => new Date(order.end_date))));
    
    // Calculate the next available date
    const nextAvailableDate = new Date(latestEndDate);
    nextAvailableDate.setDate(nextAvailableDate.getDate() + 1);

    return nextAvailableDate.toISOString().split('T')[0];
  }