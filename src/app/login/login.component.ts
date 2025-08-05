import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  vendorId: string = '';
  password: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(private http: HttpClient, private router: Router) {}

  onLogin() {
    if (!this.vendorId || !this.password) {
      this.errorMessage = 'Please enter both Vendor ID and Password';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const loginData = {
      vendorId: this.vendorId,
      password: this.password
    };

    this.http.post<any>('http://localhost:3000/vendorlogin', loginData)
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            // Store vendor info in localStorage
            localStorage.setItem('vendorId', response.vendorId);
            localStorage.setItem('isLoggedIn', 'true');
            
            // Redirect to dashboard
            this.router.navigate(['/dashboard']);
          } else {
            this.errorMessage = response.message || 'Login failed';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Login failed. Please try again.';
          console.error('Login error:', error);
        }
      });
  }
}
