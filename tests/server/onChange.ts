import test from 'ava'
import { onChangePayload } from '@hocuspocus/server'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils'
import { retryableAssertion } from '../utils/retryableAssertion'

test('onChange callback receives updates', async t => {
  await new Promise(resolve => {
    const mockContext = {
      user: 123,
    }

    const server = newHocuspocus({
      async onConnect() {
        return mockContext
      },
      async onChange({ document, context }) {
        t.deepEqual(context, mockContext)

        const value = document.getArray('foo').get(0)
        t.is(value, 'bar')

        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(server, {
      onSynced() {
        provider.document.getArray('foo').insert(0, ['bar'])
      },
    })
  })
})

test('executes onChange callback from an extension', async t => {
  await new Promise(resolve => {
    class CustomExtension {
      async onChange({ document }: onChangePayload) {
        const value = document.getArray('foo').get(0)

        t.is(value, 'bar')

        resolve('done')
      }
    }

    const server = newHocuspocus({
      extensions: [
        new CustomExtension(),
      ],
    })

    const provider = newHocuspocusProvider(server, {
      onSynced() {
        provider.document.getArray('foo').insert(0, ['bar'])
      },
    })
  })
})

test('onChange callback is not called after onLoadDocument', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      async onChange(data) {
        t.fail()
      },
      async onLoadDocument({ document }) {
        document.getArray('foo').insert(0, ['bar'])

        return document
      },
    })

    newHocuspocusProvider(server, {
      onSynced() {
        t.pass()
        resolve('done')
      },
    })
  })
})

test('has the server instance', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      async onChange({ instance }) {
        t.is(instance, server)

        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(server, {
      onSynced() {
        provider.document.getArray('foo').insert(0, ['bar'])
      },
    })
  })
})

test('onChange callback isn’t called for every new client', async t => {
  let onConnectCount = 0
  let onChangeCount = 0

  await new Promise(resolve => {
    const server = newHocuspocus({
      async onConnect() {
        onConnectCount += 1
      },
      async onChange() {
        onChangeCount += 1
      },
    })

    newHocuspocusProvider(server)
    newHocuspocusProvider(server)

    resolve('done')
  })

  await retryableAssertion(t, tt => {
    tt.is(onConnectCount, 2)
    tt.is(onChangeCount, 0)
  })

})
