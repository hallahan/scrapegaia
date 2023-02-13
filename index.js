const axios = require('axios')
const fs = require('fs')

const config = require('./config')

async function list(item) {
  const url = config.listTemplate.replace('{item}', item)
  try {
    const res = await axios({
      method: 'get',
      url,
      headers: {
        cookie: config.cookie,
      },
    })
    const items = res.data
    return items
  } catch (e) {
    console.error('Error fetching tracks list.', e)
  }

  return []
}

async function object(item, id, type) {
  const url = config.objectTemplate.replace('{item}', item).replace('{id}', id).replace('{type}', type)
  try {
    const res = await axios({
      method: 'get',
      url,
      headers: {
        cookie: config.cookie,
      },
    })
    const obj = res.data
    return obj
  } catch (e) {
    console.error(`Error fetching object ${item}.`, e)
  }

  return {}
}

function geojsonExists(item, id) {
  const path = `${config.dataDir}/${item}/${id}.geojson`
  return fs.existsSync(path)
}

function saveList(name, list) {
  const json = JSON.stringify(list, null, 2)
  fs.writeFileSync(`${config.dataDir}/${name}.json`, json)
}

function saveGeoJson(item, id, obj) {
  const json = JSON.stringify(obj, null, 2)
  fs.writeFileSync(`${config.dataDir}/${item}/${id}.geojson`, json)
}

function saveGpx(id, xmlStr) {
  if (typeof xmlStr !== 'string') {
    console.error(`gpx ${id} is not string`)
    return
  }
  fs.writeFileSync(`${config.dataDir}/tracks/${id}.gpx`, xmlStr)
}

async function scrapeTracks() {
  const tracks = await list('track')
  saveList('tracks', tracks)

  let count = 0

  for (const track of tracks) {
    if (geojsonExists('tracks', track.id)) {
      ++count
      continue
    }
    const geojson = await object('track', track.id, 'geojson')
    const gpx = await object('track', track.id, 'gpx')

    saveGeoJson('tracks', track.id, geojson)
    saveGpx(track.id, gpx)

    console.log(`${++count} of ${tracks.length} tracks ${((count / tracks.length) * 100).toFixed(2)}%`)
  }

  console.log('finished tracks', tracks.length)
}

async function scrapeRoutes() {
  const routes = await list('route')
  saveList('routes', routes)

  let count = 0

  for (const route of routes) {
    if (geojsonExists('routes', route.id)) {
      ++count
      continue
    }
    const geojson = await object('route', route.id, 'geojson')
    saveGeoJson('routes', route.id, geojson)
    console.log(`${++count} of ${routes.length} routes ${((count / routes.length) * 100).toFixed(2)}%`)
  }

  console.log('finished routes', routes.length)
}

async function scrapeWaypoints() {
  const waypoints = await list('waypoint')
  saveList('waypoints', waypoints)

  let count = 0

  for (const waypoint of waypoints) {
    if (geojsonExists('waypoints', waypoint.id)) {
      ++count
      continue
    }
    const geojson = await object('waypoint', waypoint.id, 'geojson')
    saveGeoJson('waypoints', waypoint.id, geojson)

    scrapePhoto(geojson)

    console.log(`${++count} of ${waypoints.length} waypoints ${((count / waypoints.length) * 100).toFixed(2)}%`)
  }

  console.log('finished waypoints', waypoints.length)
}

async function scrapeAreas() {
  const areas = await list('area')
  saveList('areas', areas)

  let count = 0

  for (const area of areas) {
    if (geojsonExists('areas', area.id)) {
      ++count
      continue
    }
    const geojson = await object('area', area.id, 'geojson')
    saveGeoJson('areas', area.id, geojson)
    console.log(`${++count} of ${areas.length} tracks ${((count / areas.length) * 100).toFixed(2)}%`)
  }

  console.log('finished areas', areas.length)
}

async function scrapePhoto(geojson) {
  const photos = geojson.properties?.photos
  if (!Array.isArray(photos) || photos.length === 0) {
    return
  }

  const photo = photos[0]

  const url = photo.fullsize_url

  try {
    const res = await axios({
      method: 'get',
      url,
      headers: {
        cookie: config.cookie,
      },
      responseType: 'stream',
    })
    res.data.pipe(fs.createWriteStream(`data/photos/${photo.id}.jpg`))

    return new Promise((resolve, reject) => {
      res.data.on('end', () => {
        resolve()
      })

      res.data.on('error', e => {
        reject(e)
      })
    })
  } catch (e) {
    console.error(`Error fetching photo ${photo.id} for ${geojson.id}.`)
    return Promise.reject()
  }
}

function main() {
  scrapeTracks()
  scrapeRoutes()
  scrapeWaypoints()
  scrapeAreas()
}

main()
