const axios = require('axios')
const { InfluxDB, Point } = require('@influxdata/influxdb-client')

const REMO_TOKEN = process.env.REMO_TOKEN
const INFLUXDB_URL = process.env.INFLUXDB_URL
const INFLUXDB_TOKEN = process.env.INFLUXDB_TOKEN
const INFLUXDB_ORG = process.env.INFLUXDB_ORG
const INFLUXDB_BUCKET = process.env.INFLUXDB_BUCKET

const influxDB = new InfluxDB({ url: INFLUXDB_URL, token: INFLUXDB_TOKEN })
const writeApi = influxDB.getWriteApi(INFLUXDB_ORG, INFLUXDB_BUCKET)

const main = async () => {
  const res = await axios({
    method: 'GET',
    url: 'https://api.nature.global/1/devices',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${REMO_TOKEN}`
    }
  })

  const remo = res.data[0]

  const events = [
    // 温度
    { field: 'temperature', data: remo.newest_events.te },
    // 湿度
    { field: 'humidity', data: remo.newest_events.hu },
    // 照度
    { field: 'illumination', data: remo.newest_events.il },
    // 人感センサー
    { field: 'movement', data: remo.newest_events.mo }
  ]

  const points = events.map((event) => {
    const point = new Point('natureRemo')
      .floatField(event.field, event.data.val)
      .timestamp(new Date(event.data.created_at))
    return point
  })
  console.log(points)

  writeApi.writePoints(points)

  await shutdown()
  
  console.log('done')
}

const shutdown = async () => {
  try {
    await writeApi.close()
  } catch (error) {
    console.error('ERROR: ', error)
  }
}
process.on('SIGINT', () => {
  shutdown().then(() => {
    process.exit(0)
  }).catch((e) => {
    process.exit(1)
  })
})
process.on('SIGTERM', () => {
  shutdown().then(() => {
    process.exit(0)
  }).catch((e) => {
    process.exit(1)
  })
})

main().catch(console.error)