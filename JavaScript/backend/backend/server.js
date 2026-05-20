const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Test database connection
async function testConnection() {
    const { data, error } = await supabase.from('patients').select('count');
    if (error) {
        console.error('❌ Database connection error:', error.message);
    } else {
        console.log('✅ Database connected successfully');
    }
}

// ========== PATIENT MANAGEMENT APIs ==========

// GET /api/patients - View all patient records
app.get('/api/patients', async (req, res) => {
    try {
        console.log('📋 GET /api/patients - Fetching all patients');
        
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        res.status(200).json({
            success: true,
            message: 'Patients retrieved successfully',
            count: data.length,
            data: data
        });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching patients',
            error: error.message
        });
    }
});

// GET /api/patients/:id - Retrieve patient history
app.get('/api/patients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`📋 GET /api/patients/${id} - Fetching patient history`);
        
        // Get patient basic info
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('*')
            .eq('id', id)
            .single();
        
        if (patientError) throw patientError;
        
        // Get patient's appointment history
        const { data: appointments, error: appointmentError } = await supabase
            .from('appointments')
            .select('*')
            .eq('patient_id', id)
            .order('appointment_date', { ascending: false });
        
        // Get patient's medical records
        const { data: medicalRecords, error: medicalError } = await supabase
            .from('medical_records')
            .select('*')
            .eq('patient_id', id)
            .order('visit_date', { ascending: false });
        
        res.status(200).json({
            success: true,
            message: 'Patient history retrieved successfully',
            data: {
                patient_info: patient,
                appointment_history: appointments || [],
                medical_history: medicalRecords || []
            }
        });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(404).json({
            success: false,
            message: 'Patient not found or error retrieving data',
            error: error.message
        });
    }
});

// PUT /api/patients/:id - Update patient details
app.put('/api/patients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        console.log(`✏️ PUT /api/patients/${id} - Updating patient:`, updates);
        
        // Allowed fields to update
        const allowedUpdates = ['name', 'email', 'phone', 'address', 'date_of_birth', 'blood_group'];
        const updateData = {};
        
        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                updateData[field] = updates[field];
            }
        });
        
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update. Allowed fields: name, email, phone, address, date_of_birth, blood_group'
            });
        }
        
        // Add updated timestamp
        updateData.updated_at = new Date();
        
        const { data, error } = await supabase
            .from('patients')
            .update(updateData)
            .eq('id', id)
            .select();
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Patient details updated successfully',
            data: data[0]
        });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error updating patient',
            error: error.message
        });
    }
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'University Clinic Patient Management API',
        version: '1.0.0',
        endpoints: {
            GET_all_patients: 'http://localhost:3000/api/patients',
            GET_patient_by_id: 'http://localhost:3000/api/patients/{id}',
            UPDATE_patient: 'http://localhost:3000/api/patients/{id} (PUT method)'
        },
        instructions: {
            method: 'Use GET, PUT methods',
            content_type: 'application/json',
            put_body_example: {
                name: 'Updated Name',
                phone: '+27 123 456 789',
                address: 'New Address'
            }
        }
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✅ Server running on http://localhost:${PORT}`);
    console.log(`\n📋 Test these URLs:`);
    console.log(`   1. GET    http://localhost:${PORT}/`);
    console.log(`   2. GET    http://localhost:${PORT}/api/patients`);
    console.log(`   3. GET    http://localhost:${PORT}/api/patients/{id}`);
    console.log(`   4. PUT    http://localhost:${PORT}/api/patients/{id}`);
    console.log(`\n🌐 Share with team: http://YOUR_IP:${PORT}/api/patients`);
    console.log(`\n✅ Ready for testing!\n`);
    
    // Test database connection
    testConnection();
});