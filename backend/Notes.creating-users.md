Here's how to create a user.

These instructions assume a Mac or Linux operating system. These instructions
will probably also work inside a unix emulator for Windows such as Cygwin, but
I make no guarantees.

You'll need the superuser password, which is printed when the database schema
is first installed. If you didn't save it then, Jeff will need to do some
hackery to change the password to something known.

(Notes to Jeff if this does happen: look at
`sat-backend.postgres/add-super-user` and reproduce in a REPL with appropriate
environment variables set (see project.clj for those).)

You'll also need the address of the production backend server. As of this
writing, that is `http://syssci.renci.org:8081`. We'll refer to this address
throughout this guide as `${SERVER}`. If you want to be able to copy and paste
examples that include `${SERVER}`, do this:

    export SERVER='http://syssci.renci.org:8081'

Likewise, we'll refer to the password as `${PASSWORD}`. To set it:

    export PASSWORD='...'

Once you have the password and server address, do the following.

1. If you don't already have the `curl` command installed, install it.

2. Login to the server:

    curl -i -d email="superuser@sat.com.notadomain" -d password="${PASSWORD}" "${SERVER}/login"

If all went well, the last line should be a JSON object with a key of
`auth_token` and some value. Either save the token value as `${TOKEN}` as with
`${SERVER}` and `${PASSWORD}` above, or, if you're feeling lazy, do the
following (which probably won't work unless all went well with the command
above):

    export TOKEN=$(curl -s -d email="superuser@sat.com.notadomain" -d password="${PASSWORD}" "${SERVER}/login" | cut -d\" -f4)

3. Set your email address and password variables:

    export EMAIL='...'
    export PASSWORD='...'

4. Create the user:

    curl -i -b "user_id=1,auth_token=${TOKEN}" -d email="${EMAIL}" -dpassword="${PASSWORD}" "${SERVER}/register"

If all went well, you should see a JSON object as a response with keys of "id"
and "email".

5. Optional: make the user an administrator

    curl -i -b "user_id=1,auth_token=${TOKEN}" -d email="${EMAIL}" "${SERVER}/promote"

