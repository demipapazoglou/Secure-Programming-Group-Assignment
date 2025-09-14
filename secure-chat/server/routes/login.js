new Vue({
  el: '#login-app',
  data: {
    sign_up: false,
    loggedIn: false,
    // must match v-model in signup form
    signupData: {
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    },
    // must match v-model in login form
    loginData: {
      identifier: '', // matches v-model in index.html
      password: ''
    }
  },
  methods: {
    toggleSignUp() {
      this.sign_up = !this.sign_up;
    },

    async handleLogin() {
      try {
        const response = await axios.post('/api/login', this.loginData);
        alert(response.data.message || 'Login successful!');
        window.location.href = '/profile';
      } catch (error) {
        console.error('Login error:', error);
        alert(error.response?.data?.message || 'Login failed.');
      }
    },

    async handleSignup() {
      if (this.signupData.password !== this.signupData.confirmPassword) {
        alert("Passwords do not match!");
        return;
      }

      try {
        const response = await axios.post('/api/signup', {
          username: this.signupData.username,
          email: this.signupData.email,
          password: this.signupData.password
        });
        alert(response.data.message || 'Signup successful!');
        this.sign_up = false; // go back to login form
      } catch (error) {
        console.error('Signup error:', error);
        alert(error.response?.data?.message || 'Signup failed.');
      }
    }
  }
});
