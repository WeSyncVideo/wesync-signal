import { should } from 'fuse-test-runner'

export class SocketTest {
  'should pass' () {
    should({})
      .beOkay()
      .beObject()
  }
}
