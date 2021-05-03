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
  console.time('remo')
  const res = await axios({
    method: 'GET',
    url: 'https://api.nature.global/1/devices',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${REMO_TOKEN}`
    }
  })

  const remo = res.data[0]

  // eventsは一定以上変化しないとデータを送っていないっぽい
  // なのでtimestampにnew Date(created_at)するとデータがまるめられてしまう

  // 温度
  const temperature = remo.newest_events.te.val
  // 湿度
  const humidity = remo.newest_events.hu.val
  // 照度
  const illumination = remo.newest_events.il.val
  // 人感センサー
  const movement = remo.newest_events.mo.val
  console.log(`temperature:${temperature}, humidity: ${humidity}, illumination: ${illumination}, movement: ${movement}`)

  const point = new Point('natureRemo')
    .floatField('temperature', temperature)
    .floatField('humidity', humidity)
    .floatField('illumination', illumination)
    .floatField('movement', movement)

  writeApi.writePoint(point)

  await shutdown()
  
  console.timeEnd('remo')
  console.log('done:', new Date())
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