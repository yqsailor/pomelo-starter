class Handler {
  constructor(app) {
    this.app = app;
  }

  /**
   * New client entry chat server.
   *
   * @param  {Object}   msg     request message
   * @param  {Object}   session current session object
   * @param  {Function} next    next stemp callback
   * @return {Void}
   */
  enter(msg, session, next) {
    const self = this;
    const rid = msg.rid;
    const uid = `${msg.username}*${rid}`;
    const sessionService = self.app.get('sessionService');

    // duplicate log in
    if (sessionService.getByUid(uid)) {
      return next(null, {
        code: 500,
        error: true
      });
    }

    session.bind(uid);
    session.set('rid', rid);
    session.push('rid', (err) => {
      if (err) {
        console.error('set rid for session service failed! error is : %j', err.stack);
      }
    });
    session.on('closed', this.onUserLeave.bind(null, self.app));

    // put user into channel
    self.app.rpc.chat.chatRemote.add(session, uid, self.app.get('serverId'), rid, true, (users) => {
      next(null, {
        users
      });
    });
    return next();
  }

  /**
   * User log out handler
   *
   * @param {Object} app current application
   * @param {Object} session current session object
   *
   */
  onUserLeave(app, session) {
    if (!session || !session.uid) {
      return;
    }
    this.app.rpc.chat.chatRemote.kick(session, session.uid, app.get('serverId'), session.get('rid'), null);
  }
}

module.exports = app => new Handler(app);