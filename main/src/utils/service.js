import api from './api'
import request from './request'
import enums from './enums'

const indexService = {
  async navList({ cb }) {
    const { code, data } = await request.apiGet(api.index.navList)
    if (code === enums.SUCCESS_CODE) cb(data)
  }
}

const shareService = {
  async list ({ searchData, cb }) {
    const { code, data } = await request.apiGet(api.share.list, searchData)
    if (code === enums.SUCCESS_CODE) cb(data)
  }
}

export {
  indexService,
  shareService
}
