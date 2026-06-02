// geocoder.js — address to coordinates

const Geocoder = (() => {
  const API_KEY = 'ff2a08b7-b9c6-4e84-abda-a25720b9b61d';

  async function geocode(address) {
    // Try ymaps JS API first
    try {
      const res = await ymaps.geocode(address, { results: 1 });
      const obj = res.geoObjects.get(0);
      if (obj) {
        const coords = obj.geometry.getCoordinates();
        return {
          lat: coords[0],
          lng: coords[1],
          found: obj.getAddressLine ? obj.getAddressLine() : address
        };
      }
    } catch (_) {}

    // Fallback: HTTP geocoder
    try {
      const url = `https://geocode-maps.yandex.ru/1.x/?apikey=${API_KEY}&geocode=${encodeURIComponent(address)}&format=json&results=1&lang=ru_RU`;
      const r = await fetch(url);
      const data = await r.json();
      const collection = data?.response?.GeoObjectCollection;
      const members = collection?.featureMember;
      if (!members?.length) return null;
      const pos = members[0].GeoObject.Point.pos.split(' ');
      return {
        lat: parseFloat(pos[1]),
        lng: parseFloat(pos[0]),
        found: members[0].GeoObject.metaDataProperty.GeocoderMetaData.text
      };
    } catch(e) {
      throw new Error('Geocoder error: ' + e.message);
    }
  }

  return { geocode };
})();
