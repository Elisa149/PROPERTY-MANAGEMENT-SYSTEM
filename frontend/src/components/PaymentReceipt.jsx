import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Grid,
  FormControlLabel,
  Checkbox,
  Divider,
} from '@mui/material';
import { Print, Close } from '@mui/icons-material';
import QRCode from 'qrcode';
import { format, isValid } from 'date-fns';

const PaymentReceipt = ({ payment, open, onClose }) => {
  const [qrCodeDataURL, setQrCodeDataURL] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  // Generate invoice number when component mounts
  useEffect(() => {
    if (payment) {
      // Generate invoice number: INV-YYYYMMDD-HHMMSS-XXXX
      const now = new Date();
      const dateStr = format(now, 'yyyyMMdd');
      const timeStr = format(now, 'HHmmss');
      const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      setInvoiceNumber(`INV-${dateStr}-${timeStr}-${randomNum}`);
    }
  }, [payment]);

  // Generate QR code
  useEffect(() => {
    if (payment && invoiceNumber) {
      const qrData = {
        invoiceNumber,
        paymentId: payment.id,
        amount: payment.amount,
        tenantName: payment.tenantName,
        propertyName: payment.propertyName,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod,
        organizationId: payment.organizationId,
      };

      QRCode.toDataURL(JSON.stringify(qrData), {
        width: 150,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then((url) => {
          setQrCodeDataURL(url);
        })
        .catch((err) => {
          console.error('Error generating QR code:', err);
        });
    }
  }, [payment, invoiceNumber]);

  const handlePrint = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    // Get the receipt content
    const receiptElement = document.querySelector('.receipt-content');
    if (!receiptElement) {
      console.error('Receipt content not found');
      return;
    }
    
    // Clone the receipt content
    const receiptClone = receiptElement.cloneNode(true);
    
    // Create the print HTML
    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Receipt</title>
          <style>
            @page {
              size: A4;
              margin: 0.5in;
            }
            
            body {
              margin: 0;
              padding: 0;
              font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
              background: white;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            
            .receipt-content {
              width: 100%;
              max-width: none;
              margin: 0;
              padding: 20px;
              background: white;
              box-shadow: none;
              border: none;
            }
            
            /* Ensure all content is visible */
            * {
              visibility: visible !important;
              display: block !important;
            }
            
            /* Hide any unwanted elements */
            .MuiDialog-root,
            .MuiDialog-paper,
            .MuiDialogTitle-root,
            .MuiDialogActions-root,
            .MuiBackdrop-root,
            .MuiAppBar-root,
            .MuiDrawer-root,
            .MuiToolbar-root,
            nav,
            header {
              display: none !important;
            }
            
            /* Style the receipt content */
            .receipt-content {
              background: white !important;
              box-shadow: none !important;
              border: none !important;
              margin: 0 !important;
              padding: 20px !important;
            }
            
            /* Ensure proper spacing for print */
            .MuiBox-root {
              margin-bottom: 8px;
            }
            
            .MuiTypography-root {
              color: black !important;
            }
            
            /* Ensure colors print */
            .MuiPaper-root {
              background: white !important;
            }
            
            /* QR code styling */
            img {
              max-width: 120px;
              height: auto;
            }
            
            /* Print-specific adjustments */
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
              }
              
              .receipt-content {
                padding: 15px !important;
              }
            }
          </style>
        </head>
        <body>
          ${receiptClone.outerHTML}
        </body>
      </html>
    `;
    
    // Write the HTML to the new window
    printWindow.document.write(printHTML);
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  };

  if (!payment) return null;

  // Helper function to safely parse payment date
  const parsePaymentDate = (dateValue) => {
    if (!dateValue) return new Date();
    
    let parsedDate;
    
    // Handle Firestore Timestamp objects
    if (dateValue && typeof dateValue === 'object' && dateValue.toDate) {
      parsedDate = dateValue.toDate();
    }
    // Handle Firestore Timestamp with seconds/nanoseconds
    else if (dateValue && typeof dateValue === 'object' && dateValue.seconds) {
      parsedDate = new Date(dateValue.seconds * 1000);
    }
    // Handle string or number dates
    else {
      parsedDate = new Date(dateValue);
    }
    
    // Check if the date is valid, fallback to current date if invalid
    return isValid(parsedDate) ? parsedDate : new Date();
  };

  const paymentDate = parsePaymentDate(payment.paymentDate);
  const paymentTime = isValid(paymentDate) ? format(paymentDate, 'HH:mm:ss') : format(new Date(), 'HH:mm:ss');
  const paymentDateFormatted = isValid(paymentDate) ? format(paymentDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Payment Receipt</Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<Print />}
            onClick={handlePrint}
            sx={{ mr: 1 }}
          >
            Print
          </Button>
          <Button
            variant="outlined"
            startIcon={<Close />}
            onClick={onClose}
          >
            Close
          </Button>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Paper
          className="receipt-content receipt-paper"
          elevation={0}
          sx={{
            p: 2,
            border: '1px solid #e0e0e0',
            backgroundColor: '#ffffff',
            position: 'relative',
            maxWidth: '210mm', // A4 width
            minHeight: '297mm', // A4 height
            '@media print': {
              maxWidth: '100%',
              minHeight: '100vh',
              p: 1.5,
              boxShadow: 'none',
              border: 'none',
            },
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '6px',
              backgroundColor: '#4caf50',
            },
          }}
        >
          {/* Property Title */}
          <Box
            sx={{
              textAlign: 'center',
              mb: 2,
              '@media print': {
                mb: 1.5,
              },
            }}
          >
            <Typography 
              variant="h5" 
              fontWeight="bold"
              sx={{
                fontSize: { xs: '1.2rem', md: '1.4rem' },
                '@media print': {
                  fontSize: '1.3rem',
                },
                mb: 0.5,
              }}
            >
              {payment.propertyName || 'Property Management System'}
            </Typography>
            <Typography 
              variant="body2"
              sx={{
                fontSize: '0.9rem',
                '@media print': {
                  fontSize: '0.8rem',
                },
                mb: 0.5,
              }}
            >
              Kampala, Uganda
            </Typography>
            <Typography 
              variant="body2"
              sx={{
                fontSize: '0.8rem',
                '@media print': {
                  fontSize: '0.75rem',
                },
                mb: 0.5,
              }}
            >
              Caretaker: +256 XXX XXX XXX | Email: info@propertymanagement.com
            </Typography>
          </Box>

          {/* Header */}
          <Box
            sx={{
              backgroundColor: '#26a69a',
              color: 'white',
              p: 1.5,
              mb: 2,
              textAlign: 'center',
              borderRadius: '4px',
              '@media print': {
                p: 1,
                mb: 1.5,
              },
            }}
          >
            <Typography 
              variant="h4" 
              fontWeight="bold"
              sx={{
                fontSize: { xs: '1.5rem', md: '2rem' },
                '@media print': {
                  fontSize: '1.8rem',
                },
              }}
            >
              RENT RECEIPT
            </Typography>
          </Box>

          <Grid container spacing={2}>
            {/* Left Column */}
            <Grid item xs={12} md={6}>
              {/* Payee Information */}
              <Box sx={{ mb: 2 }}>
                <Typography 
                  variant="h6" 
                  fontWeight="bold" 
                  sx={{ 
                    mb: 0.5, 
                    textDecoration: 'underline',
                    fontSize: '1rem',
                    '@media print': {
                      fontSize: '0.9rem',
                    },
                  }}
                >
                  PAYEE INFORMATION
                </Typography>
                <Box sx={{ mb: 1 }}>
                  <Typography 
                    variant="body2" 
                    fontWeight="bold"
                    sx={{ fontSize: '0.8rem' }}
                  >
                    NAME:
                  </Typography>
                  <Box
                    sx={{
                      borderBottom: '1px solid #000',
                      minHeight: '16px',
                      mb: 0.5,
                      px: 0.5,
                    }}
                  >
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                      {payment.propertyName || 'Property Management System'}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography 
                    variant="body2" 
                    fontWeight="bold"
                    sx={{ fontSize: '0.8rem' }}
                  >
                    ADDRESS:
                  </Typography>
                  <Box
                    sx={{
                      borderBottom: '1px solid #000',
                      minHeight: '16px',
                      px: 0.5,
                    }}
                  >
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                      Kampala, Uganda
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Payer Information */}
              <Box sx={{ mb: 2 }}>
                <Typography 
                  variant="h6" 
                  fontWeight="bold" 
                  sx={{ 
                    mb: 0.5, 
                    textDecoration: 'underline',
                    fontSize: '1rem',
                    '@media print': {
                      fontSize: '0.9rem',
                    },
                  }}
                >
                  PAYER INFORMATION
                </Typography>
                <Box sx={{ mb: 1 }}>
                  <Typography 
                    variant="body2" 
                    fontWeight="bold"
                    sx={{ fontSize: '0.8rem' }}
                  >
                    NAME:
                  </Typography>
                  <Box
                    sx={{
                      borderBottom: '1px solid #000',
                      minHeight: '16px',
                      mb: 0.5,
                      px: 0.5,
                    }}
                  >
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                      {payment.tenantName || 'N/A'}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography 
                    variant="body2" 
                    fontWeight="bold"
                    sx={{ fontSize: '0.8rem' }}
                  >
                    ADDRESS:
                  </Typography>
                  <Box
                    sx={{
                      borderBottom: '1px solid #000',
                      minHeight: '16px',
                      px: 0.5,
                    }}
                  >
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                      {payment.propertyName || 'N/A'}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Payment Details */}
              <Box sx={{ mb: 2 }}>
                <Typography 
                  variant="h6" 
                  fontWeight="bold" 
                  sx={{ 
                    mb: 0.5, 
                    textDecoration: 'underline',
                    fontSize: '1rem',
                    '@media print': {
                      fontSize: '0.9rem',
                    },
                  }}
                >
                  PAYMENT DETAILS
                </Typography>
                
                <Grid container spacing={1} sx={{ mb: 1 }}>
                  <Grid item xs={4}>
                    <Typography 
                      variant="body2" 
                      fontWeight="bold"
                      sx={{ fontSize: '0.8rem' }}
                    >
                      RECEIPT #:
                    </Typography>
                    <Box
                      sx={{
                        borderBottom: '1px solid #000',
                        minHeight: '16px',
                        px: 0.5,
                      }}
                    >
                      <Typography 
                        variant="body2" 
                        fontFamily="monospace"
                        sx={{ fontSize: '0.8rem' }}
                      >
                        {invoiceNumber}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography 
                      variant="body2" 
                      fontWeight="bold"
                      sx={{ fontSize: '0.8rem' }}
                    >
                      DATE:
                    </Typography>
                    <Box
                      sx={{
                        borderBottom: '1px solid #000',
                        minHeight: '16px',
                        px: 0.5,
                      }}
                    >
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        {paymentDateFormatted}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography 
                      variant="body2" 
                      fontWeight="bold"
                      sx={{ fontSize: '0.8rem' }}
                    >
                      TIME:
                    </Typography>
                    <Box
                      sx={{
                        borderBottom: '1px solid #000',
                        minHeight: '16px',
                        px: 0.5,
                      }}
                    >
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        {paymentTime}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Grid container spacing={1}>
                  {/* Payment Method */}
                  <Grid item xs={6}>
                    <Typography 
                      variant="body2" 
                      fontWeight="bold" 
                      sx={{ 
                        mb: 0.5,
                        fontSize: '0.8rem',
                      }}
                    >
                      Payment Method:
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                      {['cash', 'cheque', 'credit_card', 'bank_transfer'].map((method) => (
                        <FormControlLabel
                          key={method}
                          control={
                            <Checkbox
                              checked={payment.paymentMethod === method}
                              size="small"
                              sx={{ 
                                '& .MuiSvgIcon-root': { 
                                  fontSize: '0.8rem' 
                                },
                                py: 0,
                              }}
                            />
                          }
                          label={
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                textTransform: 'capitalize',
                                fontSize: '0.75rem',
                              }}
                            >
                              {method.replace('_', ' ')}
                            </Typography>
                          }
                          sx={{ m: 0, py: 0 }}
                        />
                      ))}
                    </Box>
                  </Grid>

                  {/* Rent Specifics */}
                  <Grid item xs={6}>
                    <Box sx={{ mb: 0.5 }}>
                      <Typography 
                        variant="body2" 
                        fontWeight="bold"
                        sx={{ fontSize: '0.8rem' }}
                      >
                        RENT FOR THE PERIOD:
                      </Typography>
                      <Box
                        sx={{
                          borderBottom: '1px solid #000',
                          minHeight: '16px',
                          px: 0.5,
                        }}
                      >
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {isValid(paymentDate) ? format(paymentDate, 'MMMM yyyy') : format(new Date(), 'MMMM yyyy')}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ mb: 0.5 }}>
                      <Typography 
                        variant="body2" 
                        fontWeight="bold"
                        sx={{ fontSize: '0.8rem' }}
                      >
                        AMOUNT:
                      </Typography>
                      <Box
                        sx={{
                          borderBottom: '1px solid #000',
                          minHeight: '16px',
                          px: 0.5,
                        }}
                      >
                        <Typography 
                          variant="body2" 
                          fontWeight="bold"
                          sx={{ fontSize: '0.8rem' }}
                        >
                          UGX {payment.amount?.toLocaleString() || '0'}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ mb: 0.5 }}>
                      <Typography 
                        variant="body2" 
                        fontWeight="bold"
                        sx={{ fontSize: '0.8rem' }}
                      >
                        PROPERTY TYPE:
                      </Typography>
                      <Box
                        sx={{
                          borderBottom: '1px solid #000',
                          minHeight: '16px',
                          px: 0.5,
                        }}
                      >
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          Rental Property
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ mb: 0.5 }}>
                      <Typography 
                        variant="body2" 
                        fontWeight="bold"
                        sx={{ fontSize: '0.8rem' }}
                      >
                        LOCATION:
                      </Typography>
                      <Box
                        sx={{
                          borderBottom: '1px solid #000',
                          minHeight: '16px',
                          px: 0.5,
                        }}
                      >
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {payment.propertyName || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box>
                      <Typography 
                        variant="body2" 
                        fontWeight="bold"
                        sx={{ fontSize: '0.8rem' }}
                      >
                        CITY, STATE, ZIP:
                      </Typography>
                      <Box
                        sx={{
                          borderBottom: '1px solid #000',
                          minHeight: '16px',
                          px: 0.5,
                        }}
                      >
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          Kampala, Uganda
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Grid>

            {/* Right Column */}
            <Grid item xs={12} md={6}>
              {/* QR Code */}
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography 
                  variant="h6" 
                  fontWeight="bold" 
                  sx={{ 
                    mb: 0.5,
                    fontSize: '0.9rem',
                    '@media print': {
                      fontSize: '0.8rem',
                    },
                  }}
                >
                  Payment Verification QR Code
                </Typography>
                {qrCodeDataURL && (
                  <Box
                    sx={{
                      display: 'inline-block',
                      p: 1,
                      border: '2px solid #e0e0e0',
                      borderRadius: '4px',
                      backgroundColor: '#f9f9f9',
                      '@media print': {
                        p: 0.5,
                      },
                    }}
                  >
                    <img
                      src={qrCodeDataURL}
                      alt="Payment QR Code"
                      style={{ 
                        maxWidth: '120px', 
                        height: 'auto',
                        '@media print': {
                          maxWidth: '100px',
                        },
                      }}
                    />
                  </Box>
                )}
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ 
                    mt: 0.5, 
                    display: 'block',
                    fontSize: '0.7rem',
                  }}
                >
                  Scan to verify payment details
                </Typography>
              </Box>

              {/* Important Notes */}
              <Box sx={{ mb: 2 }}>
                <Typography 
                  variant="h6" 
                  fontWeight="bold" 
                  sx={{ 
                    mb: 0.5, 
                    textDecoration: 'underline',
                    fontSize: '1rem',
                    '@media print': {
                      fontSize: '0.9rem',
                    },
                  }}
                >
                  IMPORTANT NOTES
                </Typography>
                <Box
                  sx={{
                    border: '1px solid #000',
                    minHeight: '80px',
                    p: 1.5,
                    backgroundColor: '#f9f9f9',
                    '@media print': {
                      minHeight: '70px',
                      p: 1,
                    },
                  }}
                >
                  <Typography variant="body2" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                    • This receipt serves as proof of payment for rent
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                    • Please keep this receipt for your records
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                    • For any queries, contact the property management office
                  </Typography>
                  {payment.notes && (
                    <>
                      <Divider sx={{ my: 0.5 }} />
                      <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.75rem' }}>
                        Additional Notes:
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                        {payment.notes}
                      </Typography>
                    </>
                  )}
                </Box>
              </Box>

              {/* Description */}
              <Box sx={{ mb: 2 }}>
                <Typography 
                  variant="h6" 
                  fontWeight="bold" 
                  sx={{ 
                    mb: 0.5, 
                    textDecoration: 'underline',
                    fontSize: '1rem',
                    '@media print': {
                      fontSize: '0.9rem',
                    },
                  }}
                >
                  DESCRIPTION
                </Typography>
                <Box
                  sx={{
                    border: '1px solid #000',
                    minHeight: '80px',
                    p: 1.5,
                    backgroundColor: '#f9f9f9',
                    '@media print': {
                      minHeight: '70px',
                      p: 1,
                    },
                  }}
                >
                  <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                    Monthly rent payment for {payment.propertyName || 'property'} 
                    for the period of {isValid(paymentDate) ? format(paymentDate, 'MMMM yyyy') : format(new Date(), 'MMMM yyyy')}. 
                    Payment method: {payment.paymentMethod?.replace('_', ' ').toUpperCase() || 'CASH'}.
                    {payment.lateFee > 0 && (
                      <> Late fee of UGX {payment.lateFee.toLocaleString()} included.</>
                    )}
                  </Typography>
                </Box>
              </Box>

              {/* Signature */}
              <Box>
                <Typography 
                  variant="h6" 
                  fontWeight="bold" 
                  sx={{ 
                    mb: 0.5, 
                    textDecoration: 'underline',
                    fontSize: '1rem',
                    '@media print': {
                      fontSize: '0.9rem',
                    },
                  }}
                >
                  PERSON RESPONSIBLE
                </Typography>
                <Typography 
                  variant="body2" 
                  fontWeight="bold" 
                  sx={{ 
                    mb: 0.5,
                    fontSize: '0.8rem',
                  }}
                >
                  SIGNATURE:
                </Typography>
                <Box
                  sx={{
                    borderBottom: '1px solid #000',
                    minHeight: '30px',
                    px: 0.5,
                    mb: 1,
                    '@media print': {
                      minHeight: '25px',
                    },
                  }}
                />
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ fontSize: '0.75rem' }}
                >
                  Property Management System
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Footer */}
          <Box 
            className="receipt-footer"
            sx={{ 
              textAlign: 'center', 
              mt: 2, 
              pt: 1, 
              borderTop: '1px solid #e0e0e0',
              '@media print': {
                mt: 1,
                pt: 0.5,
              },
            }}>
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ fontSize: '0.7rem', display: 'block', mb: 0.5 }}
            >
              Generated by Property Management System
            </Typography>
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ fontSize: '0.7rem' }}
            >
              Caretaker: +256 XXX XXX XXX | Email: info@propertymanagement.com
            </Typography>
          </Box>
        </Paper>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentReceipt;
