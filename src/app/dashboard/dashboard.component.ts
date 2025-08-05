import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  vendorId: string = '';
  vendorProfile: any = null;
  isLoading: boolean = false;
  errorMessage: string = '';
  
  // Data properties for different sections
  rfqData: any[] = [];
  purchaseOrders: any[] = [];
  goodsReceipts: any[] = [];
  invoiceList: any[] = [];
  paymentsAndAging: any[] = [];
  creditDebitMemos: any[] = [];
  
  // Loading states for different sections
  loadingStates = {
    profile: false,
    rfq: false,
    po: false,
    gr: false,
    invoice: false,
    payments: false,
    memo: false
  };
  
  // Active section for displaying data
  activeSection: string = '';
  showDataModal: boolean = false;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const storedVendorId = localStorage.getItem('vendorId');

    if (!isLoggedIn || !storedVendorId) {
      this.router.navigate(['/login']);
      return;
    }

    this.vendorId = storedVendorId;
    this.loadVendorProfile();
  }

  loadVendorProfile() {
    this.loadingStates.profile = true;
    this.errorMessage = '';

    const profileData = {
      vendorId: this.vendorId
    };

    this.http.post<any>('http://localhost:3000/vendorprofile', profileData)
      .subscribe({
        next: (response) => {
          this.loadingStates.profile = false;
          this.vendorProfile = response;
        },
        error: (error) => {
          this.loadingStates.profile = false;
          this.errorMessage = 'Failed to load vendor profile';
          console.error('Profile error:', error);
        }
      });
  }

  loadRFQData() {
    this.loadingStates.rfq = true;
    const requestData = { vendorId: this.vendorId };

    this.http.post<any>('http://localhost:3000/vendorrfq', requestData)
      .subscribe({
        next: (response) => {
          this.loadingStates.rfq = false;
          this.rfqData = Array.isArray(response) ? response : [];
        },
        error: (error) => {
          this.loadingStates.rfq = false;
          console.error('RFQ error:', error);
          this.rfqData = [];
        }
      });
  }

  loadPurchaseOrders() {
    this.loadingStates.po = true;
    const requestData = { vendorId: this.vendorId };

    this.http.post<any>('http://localhost:3000/vendor-po', requestData)
      .subscribe({
        next: (response) => {
          this.loadingStates.po = false;
          this.purchaseOrders = response.purchaseOrders || [];
        },
        error: (error) => {
          this.loadingStates.po = false;
          console.error('PO error:', error);
          this.purchaseOrders = [];
        }
      });
  }

  loadGoodsReceipts() {
    this.loadingStates.gr = true;
    const requestData = { vendorId: this.vendorId };

    this.http.post<any>('http://localhost:3000/vendor-gr', requestData)
      .subscribe({
        next: (response) => {
          this.loadingStates.gr = false;
          this.goodsReceipts = response.goodsReceipts || [];
        },
        error: (error) => {
          this.loadingStates.gr = false;
          console.error('GR error:', error);
          this.goodsReceipts = [];
        }
      });
  }

  loadInvoiceList() {
    this.loadingStates.invoice = true;
    const requestData = { vendorId: this.vendorId };

    this.http.post<any>('http://localhost:3000/vendor-invoicelist', requestData)
      .subscribe({
        next: (response) => {
          this.loadingStates.invoice = false;
          this.invoiceList = response.invoiceList || [];
        },
        error: (error) => {
          this.loadingStates.invoice = false;
          console.error('Invoice error:', error);
          this.invoiceList = [];
        }
      });
  }

  loadPaymentsAndAging() {
    this.loadingStates.payments = true;
    const requestData = { vendorId: this.vendorId };

    this.http.post<any>('http://localhost:3000/vendor-paymentsaging', requestData)
      .subscribe({
        next: (response) => {
          this.loadingStates.payments = false;
          this.paymentsAndAging = response.paymentsAndAging || [];
        },
        error: (error) => {
          this.loadingStates.payments = false;
          console.error('Payments error:', error);
          this.paymentsAndAging = [];
        }
      });
  }

  loadCreditDebitMemos() {
    this.loadingStates.memo = true;
    const requestData = { vendorId: this.vendorId };

    this.http.post<any>('http://localhost:3000/vendor-creditdebitmemo', requestData)
      .subscribe({
        next: (response) => {
          this.loadingStates.memo = false;
          this.creditDebitMemos = response.creditDebitMemos || [];
        },
        error: (error) => {
          this.loadingStates.memo = false;
          console.error('Credit/Debit Memo error:', error);
          this.creditDebitMemos = [];
        }
      });
  }

  viewInvoiceForm(docNo: string) {
    const requestData = {
      vendorId: this.vendorId,
      docNo: docNo
    };

    // Open PDF in new tab for preview
    const url = 'http://localhost:3000/vendor-invoiceforms';
    
    // Create a form to submit POST request in new tab
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = url;
    form.target = '_blank';
    
    // Add vendorId field
    const vendorIdField = document.createElement('input');
    vendorIdField.type = 'hidden';
    vendorIdField.name = 'vendorId';
    vendorIdField.value = this.vendorId;
    form.appendChild(vendorIdField);
    
    // Add docNo field
    const docNoField = document.createElement('input');
    docNoField.type = 'hidden';
    docNoField.name = 'docNo';
    docNoField.value = docNo;
    form.appendChild(docNoField);
    
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  }

  downloadInvoiceForm(docNo: string) {
    const requestData = {
      vendorId: this.vendorId,
      docNo: docNo
    };

    this.http.post('http://localhost:3000/vendor-invoiceforms', requestData, {
      responseType: 'blob'
    }).subscribe({
      next: (response: Blob) => {
        // Create blob URL and download
        const blob = new Blob([response], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Invoice_${docNo}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Download error:', error);
        alert('Failed to download invoice form');
      }
    });
  }

  navigateToSection(section: string) {
    this.activeSection = section;
    this.showDataModal = true;
    
    // Load data based on section
    switch(section) {
      case 'rfq':
        if (this.rfqData.length === 0) {
          this.loadRFQData();
        }
        break;
      case 'po':
        if (this.purchaseOrders.length === 0) {
          this.loadPurchaseOrders();
        }
        break;
      case 'gr':
        if (this.goodsReceipts.length === 0) {
          this.loadGoodsReceipts();
        }
        break;
      case 'invoice':
        if (this.invoiceList.length === 0) {
          this.loadInvoiceList();
        }
        break;
      case 'payments':
        if (this.paymentsAndAging.length === 0) {
          this.loadPaymentsAndAging();
        }
        break;
      case 'memo':
        if (this.creditDebitMemos.length === 0) {
          this.loadCreditDebitMemos();
        }
        break;
    }
  }

  closeModal() {
    this.showDataModal = false;
    this.activeSection = '';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }

  formatCurrency(amount: string, currency: string = 'INR'): string {
    if (!amount) return 'N/A';
    return `${amount} ${currency}`;
  }

  getSectionTitle(section: string): string {
    const titles: { [key: string]: string } = {
      'rfq': 'Request for Quotation',
      'po': 'Purchase Orders',
      'gr': 'Goods Receipts',
      'invoice': 'Invoice Details',
      'payments': 'Payments and Aging',
      'memo': 'Credit/Debit Memos'
    };
    return titles[section] || 'Data';
  }

  getSectionLoading(section: string): boolean {
    switch(section) {
      case 'rfq':
        return this.loadingStates.rfq;
      case 'po':
        return this.loadingStates.po;
      case 'gr':
        return this.loadingStates.gr;
      case 'invoice':
        return this.loadingStates.invoice;
      case 'payments':
        return this.loadingStates.payments;
      case 'memo':
        return this.loadingStates.memo;
      default:
        return false;
    }
  }

  logout() {
    localStorage.removeItem('vendorId');
    localStorage.removeItem('isLoggedIn');
    this.router.navigate(['/login']);
  }
}
