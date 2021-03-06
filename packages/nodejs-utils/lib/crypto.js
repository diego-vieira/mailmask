const crypto = require('crypto')

exports.decrypt = async (ciphertext, { key, iv }) => {
  const cipher = crypto.createDecipheriv(
    'aes-256-cbc',
    key,
    iv
  )

  const plaintext = cipher.update(ciphertext, 'hex', 'utf8') + cipher.final('utf8')

  return JSON.parse(plaintext)[1]
}

exports.encrypt = async (data, { key, iv }) => {
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    key,
    iv
  )

  const salt = await new Promise((resolve, reject) => {
    crypto.randomBytes(32, (err, buf) => {
      if (err) {
        reject(err)
      } else {
        resolve(buf.toString('hex'))
      }
    })
  })

  const plaindata = [
    salt.substr(0, salt.length / 2),
    data,
    salt.substr(salt.length / 2)
  ]

  return (
    cipher.update(JSON.stringify(plaindata), 'utf8', 'hex') + cipher.final('hex')
  )
}
