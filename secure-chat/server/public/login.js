new Vue({
  el: '#login-app',
  data: {
    sign_up: false,  // set to true temporarily to land on Sign Up first
    signupData: { username: '', email: '', password: '', confirmPassword: '' },
    loginData: { identifier: '', password: '' }
  },
  created() {
    console.log('[vue] created, initial state:', JSON.parse(JSON.stringify(this.$data)));
  },
  methods: {
    toggleSignUp() { 
      this.sign_up = !this.sign_up; 
      console.log('[vue] toggled sign_up ->', this.sign_up);
    },

    async handleSignup() {
      console.log('[signup] preflight data:', JSON.parse(JSON.stringify(this.signupData)));

      const u = (this.signupData.username || '').trim();
      const e = (this.signupData.email || '').trim();
      const p = this.signupData.password || '';
      const c = this.signupData.confirmPassword || '';

      if (!u || !e || !p) return alert('Please fill out all fields.');
      if (p !== c) return alert('Passwords do not match!');

      try {
        const res = await axios.post('/api/signup',
          { username: u, email: e, password: p },
          { headers: { 'Content-Type': 'application/json' } }
        );
        console.log('[signup] server response:', res.data);
        alert(res.data?.message || 'Signup successful!');
        window.location.href = '/chat.html';
      } catch (err) {
        console.error('[signup] error:', err?.response?.data || err.message);
        alert(err?.response?.data?.message || 'Signup failed.');
      }
    },

    async handleLogin() {
      console.log('[login] preflight data:', JSON.parse(JSON.stringify(this.loginData)));

      const id = (this.loginData.identifier || '').trim();
      const pw = this.loginData.password || '';
      if (!id || !pw) return alert('Please enter your username/email and password.');

      try {
        const res = await axios.post('/api/login',
          { identifier: id, password: pw },
          { headers: { 'Content-Type': 'application/json' } }
        );
        console.log('[login] server response:', res.data);
        alert(res.data?.message || 'Login successful!');
        window.location.href = '/chat.html';
      } catch (err) {
        console.error('[login] error:', err?.response?.data || err.message);
        alert(err?.response?.data?.message || 'Login failed.');
      }
    }
  }
});
