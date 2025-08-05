const express = require('express');
const axios = require('axios');
const cors = require('cors');
const https = require('https');
const xml2js = require('xml2js');
const app = express();
app.use(express.json());
app.use(cors());

const SAP_URL = 'https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZVN_ODATA_PR_SRV/LoginSet';
const SAP_USERNAME = 'k901673';
const SAP_PASSWORD = 'Tpraburam733@';

const agent = new https.Agent({
  rejectUnauthorized: false // Allow self-signed certs
});

app.use(express.json());

app.post("/vendorlogin", async (req, res) => {
    const { vendorId, password } = req.body;

    try {
        // Step 1: Get CSRF token
        const tokenResponse = await axios({
            method: 'GET',
            url: 'https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZVN_ODATA_PR_SRV/',
            headers: {
                'Authorization': 'Basic SzkwMTUwMzpQcmFkZWlzaDI5',
                'X-CSRF-Token': 'Fetch',
                'Accept': 'application/json'
            },
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
        });

        const csrfToken = tokenResponse.headers['x-csrf-token'];
        const cookies = tokenResponse.headers['set-cookie'];

        // Step 2: Post login data
        const loginResponse = await axios({
            method: 'POST',
            url: 'https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZVN_ODATA_PR_SRV/LoginSet',
            headers: {
                'Authorization': 'Basic SzkwMTY3MzpUcHJhYnVyYW0nNzMzQA==',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-Token': csrfToken,
                'Cookie': cookies ? cookies.join("; ") : ''
            },
            data: {
                VENDOR_ID: vendorId,
                PASSWORD: password
            },
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
        });

        const result = loginResponse.data?.d;
        res.send({
            vendorId: result?.VENDOR_ID,
            message: result?.RETURN,
            success: result?.RETURN === "Login successful"
        });

    } catch (error) {
        console.error("❌ Login Error:", error.message);
        if (error.response) {
            console.error("Response:", error.response.data);
        }
        res.status(500).send({
            message: "Login failed",
            details: error.response?.data?.error?.message?.value || error.message
        });
    }
});

app.post("/vendorprofile", async (req, res) => {
    const { vendorId } = req.body;

    if (!vendorId) {
        return res.status(400).json({ error: "Vendor ID is required" });
    }

    const url = `http://AZKTLDS5CP.kcloud.com:8000/sap/opu/odata/sap/ZVN_ODATA_PR_SRV/ProfileSet('${vendorId}')`;
    const auth = Buffer.from('K901673:Tpraburam733@').toString('base64');

    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/xml',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const xml = response.data;

        xml2js.parseString(xml, { explicitArray: false }, (err, result) => {
            if (err) {
                return res.status(500).json({ error: "XML parsing failed", details: err.message });
            }

            const props = result?.entry?.content?.['m:properties'];
            if (!props) {
                return res.status(404).json({ error: "Vendor profile not found" });
            }

            res.json({
                vendorId: props['d:Lifnr'],
                name: props['d:Name1'],
                city: props['d:Orto1'],
                country: props['d:Land1'],
                postalCode: props['d:Pstlz'],
                region: props['d:Regio'],
                street: props['d:Stras'],
                addressNumber: props['d:Adrnr']
            });
        });

    } catch (error) {
        console.error("Request failed:", error.response?.status, error.message);
        return res.status(500).json({
            error: "Failed to fetch vendor profile",
            details: error.response?.statusText || error.message
        });
    }
});

app.use(express.json());

app.post("/vendorrfq", async (req, res) => {
    const { vendorId } = req.body;

    if (!vendorId) {
        return res.status(400).json({ error: "Vendor ID is required" });
    }

    const auth = Buffer.from('K901673:Tpraburam733@').toString('base64');
    const url = `https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZVN_ODATA_PR_SRV/VendorRfqSet?$filter=Lifnr eq '${vendorId}'`;

    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/xml',
                'X-Requested-With': 'XMLHttpRequest'
            },
            httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
        });

        const xml = response.data;

        xml2js.parseString(xml, { explicitArray: false }, (err, result) => {
            if (err) {
                return res.status(500).json({ error: "XML parsing failed", details: err.message });
            }

            const entries = result?.feed?.entry;
            if (!entries) {
                return res.status(404).json({ error: "No RFQ entries found" });
            }

            const rfqs = Array.isArray(entries) ? entries : [entries];

            const formatted = rfqs.map(entry => {
                const props = entry?.content?.['m:properties'];
                return {
                    rfqNo: props['d:Ebeln'],
                    vendorId: props['d:Lifnr'],
                    date: props['d:Bedat'],
                    item: props['d:Ebelp'],
                    material: props['d:Matnr'],
                    unit: props['d:Meins'],
                    description: props['d:Txz01'],
                    docType: props['d:Bstyp']
                };
            });

            res.json(formatted);
        });

    } catch (error) {
        console.error("Request failed:", error.response?.status, error.message);
        return res.status(500).json({
            error: "Failed to fetch Vendor RFQ data",
            details: error.response?.statusText || error.message
        });
    }
});

app.post('/vendor-po', async (req, res) => {
    const { vendorId } = req.body;

    if (!vendorId) {
        return res.status(400).json({ error: "Vendor ID is required" });
    }

    const url = `https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZVN_ODATA_PR_SRV/PurchaseOrderSet?$filter=Lifnr eq '${vendorId}'`;
    const auth = Buffer.from('K901673:Tpraburam733@').toString('base64');

    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/xml',
                'X-Requested-With': 'XMLHttpRequest'
            },
            httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
        });

        const xml = response.data;

        xml2js.parseString(xml, { explicitArray: false }, (err, result) => {
            if (err) {
                return res.status(500).json({ error: "XML parsing failed", details: err.message });
            }

            const entries = result?.feed?.entry;
            if (!entries) {
                return res.status(404).json({ message: "No Purchase Orders found", vendorId });
            }

            const poList = Array.isArray(entries) ? entries : [entries];
            const data = poList.map(entry => {
                const props = entry?.content?.['m:properties'];
                return {
                    ebeln: props?.['d:Ebeln'],     // PO Number
                    ebelp: props?.['d:Ebelp'],     // PO Item
                    lifnr: props?.['d:Lifnr'],     // Vendor ID
                    matnr: props?.['d:Matnr'],     // Material
                    meins: props?.['d:Meins'],     // Unit
                    menge: props?.['d:Menge'],     // Quantity
                    netwr: props?.['d:Netwr'],     // Net Price
                    txz01: props?.['d:Txz01'],     // Short Text
                    bedat: props?.['d:Bedat']      // PO Date
                };
            });

            res.json({ vendorId, purchaseOrders: data });
        });

    } catch (error) {
        console.error("PO Fetch Error:", error.response?.status, error.message);
        return res.status(500).json({
            error: "Failed to fetch Vendor Purchase Orders",
            details: error.response?.statusText || error.message
        });
    }
});

app.post('/vendor-gr', async (req, res) => {
    const { vendorId } = req.body;

    if (!vendorId) {
        return res.status(400).json({ error: "Vendor ID is required" });
    }

    const url = `https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZVN_ODATA_PR_SRV/GoodsReceiptSet?$filter=Lifnr eq '${vendorId}'`;
    const auth = Buffer.from('K901673:Tpraburam733@').toString('base64'); // Replace with valid credentials

    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/xml',
                'X-Requested-With': 'XMLHttpRequest'
            },
            httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
        });

        const xml = response.data;

        xml2js.parseString(xml, { explicitArray: false }, (err, result) => {
            if (err) {
                return res.status(500).json({ error: "XML parsing failed", details: err.message });
            }

            const entries = result?.feed?.entry;
            if (!entries) {
                return res.status(404).json({ message: "No Goods Receipts found", vendorId });
            }

            const grList = Array.isArray(entries) ? entries : [entries];
            const data = grList.map(entry => {
                const props = entry?.content?.['m:properties'];
                return {
                    ebeln: props?.['d:Ebeln'],   // PO Number
                    ebelp: props?.['d:Ebelp'],   // PO Item
                    lifnr: props?.['d:Lifnr'],   // Vendor
                    matnr: props?.['d:Matnr'],   // Material
                    meins: props?.['d:Meins'],   // Unit
                    menge: props?.['d:Menge'],   // Quantity
                    mblnr: props?.['d:Mblnr'],   // Material Doc
                    mjahr: props?.['d:Mjahr'],   // Year
                    cpudt: props?.['d:Cpudt'],   // Entry Date
                    budat: props?.['d:Budat']    // Posting Date
                };
            });

            res.json({ vendorId, goodsReceipts: data });
        });

    } catch (error) {
        console.error("Goods Receipt Fetch Error:", error.response?.status, error.message);
        return res.status(500).json({
            error: "Failed to fetch Vendor Goods Receipts",
            details: error.response?.statusText || error.message
        });
    }
});

app.post('/vendor-invoicelist', async (req, res) => {
    const { vendorId } = req.body;

    if (!vendorId) {
        return res.status(400).json({ error: "Vendor ID is required" });
    }

    const url = `https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZVN_ODATA_PR_SRV/INVOICELISTSet?$filter=Lifnr eq '${vendorId}'`;
    const auth = Buffer.from('K901673:Tpraburam733@').toString('base64'); // Replace with your actual credentials

    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/xml',
                'X-Requested-With': 'XMLHttpRequest'
            },
            httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
        });

        const xml = response.data;

        xml2js.parseString(xml, { explicitArray: false }, (err, result) => {
            if (err) {
                return res.status(500).json({ error: "XML parsing failed", details: err.message });
            }

            const entries = result?.feed?.entry;
            if (!entries) {
                return res.status(404).json({ message: "No invoice data found", vendorId });
            }

            const invoiceList = Array.isArray(entries) ? entries : [entries];
            const data = invoiceList.map(entry => {
                const props = entry?.content?.['m:properties'];
                return {
                    lifnr: props?.['d:Lifnr'],    // Vendor ID
                    belnrD: props?.['d:BelnrD'],  // Document Number
                    budat: props?.['d:Budat'],    // Posting Date
                    waers: props?.['d:Waers'],    // Currency
                    wrbtr: props?.['d:Wrbtr'],    // Amount
                    gjahr: props?.['d:Gjahr']     // Fiscal Year
                };
            });

            res.json({ vendorId, invoiceList: data });
        });

    } catch (error) {
        console.error("Invoice List Fetch Error:", error.response?.status, error.message);
        return res.status(500).json({
            error: "Failed to fetch Vendor Invoice List",
            details: error.response?.statusText || error.message
        });
    }
});

app.post('/vendor-paymentsaging', async (req, res) => {
    const { vendorId } = req.body;

    if (!vendorId) {
        return res.status(400).json({ error: "Vendor ID is required" });
    }

    const url = `https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZVN_ODATA_PR_SRV/PaymentsandAgingSet?$filter=Lifnr eq '${vendorId}'`;
    const auth = Buffer.from('K901673:Tpraburam733@').toString('base64'); // Replace with secure credentials

    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/xml',
                'X-Requested-With': 'XMLHttpRequest'
            },
            httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
        });

        const xml = response.data;

        xml2js.parseString(xml, { explicitArray: false }, (err, result) => {
            if (err) {
                return res.status(500).json({ error: "XML parsing failed", details: err.message });
            }

            const entries = result?.feed?.entry;
            if (!entries) {
                return res.status(404).json({ message: "No payments or aging data found", vendorId });
            }

            const agingList = Array.isArray(entries) ? entries : [entries];
            const data = agingList.map(entry => {
                const props = entry?.content?.['m:properties'];
                return {
                    lifnr: props?.['d:Lifnr'],     // Vendor ID
                    belnrD: props?.['d:BelnrD'],   // Document Number
                    budat: props?.['d:Budat'],     // Posting Date
                    cpudt: props?.['d:Cpudt'],     // Entry Date
                    dzfbdt: props?.['d:Dzfbdt'],   // Due Date
                    dmbtr: props?.['d:Dmbtr'],     // Amount
                    waers: props?.['d:Waers'],     // Currency
                    aging: props?.['d:Aging']      // Aging Days
                };
            });

            res.json({ vendorId, paymentsAndAging: data });
        });

    } catch (error) {
        console.error("Payments & Aging Fetch Error:", error.response?.status, error.message);
        return res.status(500).json({
            error: "Failed to fetch Vendor Payments and Aging data",
            details: error.response?.statusText || error.message
        });
    }
});

app.post('/vendor-creditdebitmemo', async (req, res) => {
    const { vendorId } = req.body;

    if (!vendorId) {
        return res.status(400).json({ error: "Vendor ID is required" });
    }

    const url = `https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZVN_ODATA_PR_SRV/CreditDebitMemoSet?$filter=Lifnr eq '${vendorId}'`;
    const auth = Buffer.from('K901673:Tpraburam733@').toString('base64'); // Replace with secure credentials

    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/xml',
                'X-Requested-With': 'XMLHttpRequest'
            },
            httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
        });

        const xml = response.data;

        xml2js.parseString(xml, { explicitArray: false }, (err, result) => {
            if (err) {
                return res.status(500).json({ error: "XML parsing failed", details: err.message });
            }

            const entries = result?.feed?.entry;
            if (!entries) {
                return res.status(404).json({ message: "No credit/debit memo data found", vendorId });
            }

            const memoList = Array.isArray(entries) ? entries : [entries];
            const data = memoList.map(entry => {
                const props = entry?.content?.['m:properties'];
                return {
                    lifnr: props?.['d:Lifnr'],      // Vendor ID
                    belnrD: props?.['d:BelnrD'],    // Document Number
                    budat: props?.['d:Budat'],      // Posting Date
                    cpudt: props?.['d:Cpudt'],      // Entry Date
                    blart: props?.['d:Blart'],      // Document Type (RE, etc.)
                    dmbtr: props?.['d:Dmbtr'],      // Amount
                    waers: props?.['d:Waers'],      // Currency
                    bukrs: props?.['d:Bukrs'],      // Company Code
                    shkzg: props?.['d:Shkzg']       // Debit/Credit Indicator (H, S)
                };
            });

            res.json({ vendorId, creditDebitMemos: data });
        });

    } catch (error) {
        console.error("Credit/Debit Memo Fetch Error:", error.response?.status, error.message);
        return res.status(500).json({
            error: "Failed to fetch Vendor Credit/Debit Memo data",
            details: error.response?.statusText || error.message
        });
    }
});

app.post('/vendor-invoiceforms', async (req, res) => {
    const { vendorId, docNo } = req.body;

    if (!vendorId || !docNo) {
        return res.status(400).json({ error: "Vendor ID and Document Number are required" });
    }

    const url = `http://AZKTLDS5CP.kcloud.com:8000/sap/opu/odata/sap/ZVN_ODATA_PR_SRV/INVOICEFORMSSet(LIFNR='${vendorId}',BELNR_D='${docNo}')/$value`;
    const auth = Buffer.from('K901673:Tpraburam733@').toString('base64');

    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/pdf',
                'X-Requested-With': 'XMLHttpRequest'
            },
            httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=Invoice_${docNo}.pdf`);
        res.send(response.data);

    } catch (error) {
        console.error("Invoice Form Fetch Error:", error.response?.status, error.message);
        return res.status(500).json({
            error: "Failed to fetch Vendor Invoice Form",
            details: error.response?.statusText || error.message
        });
    }
});



const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Vendor Login API running on http://localhost:${PORT}`);
});
