const fs = require('fs')
const config = require('./config')

const dataDir = config.dataDir

function geojsonFilePaths(subdir) {
  const dir = `${dataDir}/${subdir}`
  const files = fs.readdirSync(dir)
  const paths = files.filter(f => f.indexOf('.geojson') !== -1).map(f => `${dir}/${f}`)
  return paths
}

function main() {
  const areas = geojsonFilePaths('areas')
  const routes = geojsonFilePaths('routes')
  const tracks = geojsonFilePaths('tracks')
  const waypoints = geojsonFilePaths('waypoints')

  const allFiles = areas.concat(routes, tracks, waypoints)

  let features = []

  for (const f of allFiles) {
    const str = fs.readFileSync(f)
    const geojson = JSON.parse(str)

    switch (geojson.type) {
      case 'FeatureCollection':
        features = features.concat(geojson.features)
        break
      case 'Feature':
        features.push(geojson)
        break
    }

  }

  const fc = {
    type: 'FeatureCollection',
    features,
  }

  const str = JSON.stringify(fc, null, 2)

  const path = `${dataDir}/combined.geojson`
  fs.writeFileSync(path, str)

  console.log(`Combined ${allFiles.length} files with ${features.length} features to ${path}.`)
}

main()
