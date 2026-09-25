async function checkUniqueIds() {
  const res = await fetch("http://localhost:3000/api/gps");
  const json = await res.json();
  const objects = json.data?.object || [];
  
  console.log("Total objects:", objects.length);
  
  const missingUniqueId = objects.filter(o => !o.deviceUniqueId && !o.uniqueId && !o.id);
  console.log("Objects missing any ID:", missingUniqueId.length);

  const ids = objects.map((o, index) => ({
    index,
    name: o.name,
    id: o.id,
    deviceUniqueId: o.deviceUniqueId,
    typeId: typeof o.deviceUniqueId
  }));
  
  console.log("First 10 IDs:", ids.slice(0, 10));
}

checkUniqueIds();
