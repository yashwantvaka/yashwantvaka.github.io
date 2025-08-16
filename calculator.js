// Filing status enum
const FilingStatus = {
    SINGLE: 'single',
    MARRIED_FILING_JOINTLY: 'married'
};

// Tax rate functions
function getFederalTaxRate(income, filingStatus) {
    if (filingStatus === FilingStatus.SINGLE) {
        if (income <= 11000) return 0.10;
        if (income <= 44725) return 0.12;
        if (income <= 95375) return 0.22;
        if (income <= 182050) return 0.24;
        if (income <= 231250) return 0.32;
        if (income <= 578125) return 0.35;
        return 0.37;
    } else {
        if (income <= 22000) return 0.10;
        if (income <= 89450) return 0.12;
        if (income <= 190750) return 0.22;
        if (income <= 364200) return 0.24;
        if (income <= 462500) return 0.32;
        if (income <= 693750) return 0.35;
        return 0.37;
    }
}

function getTaxRates(income, filingStatus, propertyTaxRate) {
    const federalRate = getFederalTaxRate(income, filingStatus);

    return {
        federal: federalRate,
        state: 0.0,
        property: propertyTaxRate
    };
}

function validateInputs(housePrice, userIncome, mortgageRate, homeAppreciation, downPayment) {
    const warnings = [];

    if (housePrice <= 0) warnings.push("House price must be positive");
    if (userIncome <= 0) warnings.push("User income must be positive");
    if (mortgageRate < 0 || mortgageRate > 20) warnings.push(`Mortgage rate seems unrealistic (${mortgageRate}%)`);
    if (homeAppreciation < -10 || homeAppreciation > 20) warnings.push(`Home appreciation rate seems extreme (${homeAppreciation}%)`);
    if (downPayment < 3 || downPayment > 50) warnings.push(`Down payment percentage seems unusual (${downPayment}%)`);
    if (housePrice > userIncome * 10) warnings.push("House price is more than 10x annual income - may not be affordable");

    return warnings;
}

function calculateMonthlyMortgagePayment(loanAmount, annualRate, years = 30) {
    const monthlyRate = annualRate / 12;
    const numPayments = years * 12;

    if (monthlyRate === 0) {
        return loanAmount / numPayments;
    }

    return loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
           (Math.pow(1 + monthlyRate, numPayments) - 1);
}

function calculateHomeNetCost(params) {
    const {
        housePrice, userIncome, mortgageRate, homeAppreciation,
        filingStatus, insurancePercent = 0.005, downPaymentPercent = 0.20,
        closingCostsPercent = 0.03, opportunityCostRate = 0.08, mortgageYears = 30, maintenanceCostRate = 0.01, propertyTaxRate = .01
    } = params;

    // Convert percentages
    const mortgageRateDecimal = mortgageRate / 100;
    const homeAppreciationDecimal = homeAppreciation / 100;
    const downPaymentDecimal = downPaymentPercent / 100;
    const opportunityCostDecimal = opportunityCostRate / 100;
    const maintenanceCostRateDecimal = maintenanceCostRate / 100;
    const propertyTaxRateDecimal = propertyTaxRate / 100;

    const warnings = validateInputs(housePrice, userIncome, mortgageRate, homeAppreciation, downPaymentPercent);
    const taxRates = getTaxRates(userIncome, filingStatus, propertyTaxRateDecimal);
    const totalTaxRate = taxRates.federal + taxRates.state;

    // Upfront costs
    const downPayment = housePrice * downPaymentDecimal;
    const closingCosts = housePrice * closingCostsPercent;
    const totalUpfrontCosts = downPayment + closingCosts;
    const opportunityCostUpfront = totalUpfrontCosts * opportunityCostDecimal;

    // Mortgage calculations
    const loanAmount = housePrice - downPayment;
    const monthlyMortgagePayment = calculateMonthlyMortgagePayment(loanAmount, mortgageRateDecimal, mortgageYears);
    const annualMortgagePayment = monthlyMortgagePayment * 12;
    const opportunityCostMortgagePayments = annualMortgagePayment * opportunityCostDecimal;
    const totalOpportunityCost = opportunityCostUpfront + opportunityCostMortgagePayments;

    // Other annual costs
    const propertyTax = housePrice * taxRates.property;
    const propertyTaxDeduction = Math.min(propertyTax, 10000);
    const insurance = housePrice * insurancePercent;
    const maintenance = housePrice * maintenanceCostRateDecimal;

    // Tax benefits
    const mortgagePrincipalForDeduction = Math.min(loanAmount, 750000);
    const annualMortgageInterest = mortgagePrincipalForDeduction * mortgageRateDecimal;
    const mortgageInterestTaxSavings = annualMortgageInterest * totalTaxRate;
    const propertyTaxTaxSavings = propertyTaxDeduction * totalTaxRate;

    // Home appreciation
    const homeAppreciationValue = housePrice * homeAppreciationDecimal;

    // Net cost calculation
    const totalAnnualCosts = annualMortgagePayment + propertyTax + insurance + maintenance + totalOpportunityCost;
    const totalAnnualBenefits = homeAppreciationValue + mortgageInterestTaxSavings + propertyTaxTaxSavings;
    const totalNetCost = totalAnnualCosts - totalAnnualBenefits;

    // Affordability analysis
    const monthlyPayment = (annualMortgagePayment + propertyTax + insurance + maintenance) / 12;
    const monthlyIncome = userIncome / 12;
    const frontEndRatio = monthlyPayment / monthlyIncome;
    const isAffordable = frontEndRatio <= 0.28;

    return {
        totalNetCost,
        monthlyPayment,
        frontEndRatio,
        isAffordable,
        totalTaxRate,
        breakdown: {
            annualMortgagePayment,
            propertyTax,
            insurance,
            maintenance,
            opportunityCostUpfront,
            opportunityCostMortgagePayments,
            totalOpportunityCost,
            homeAppreciationValue,
            mortgageInterestTaxSavings,
            propertyTaxTaxSavings,
            downPayment,
            closingCosts,
            totalUpfrontCosts,
            monthlyMortgagePayment,
            federalTaxRate: taxRates.federal,
            stateTaxRate: taxRates.state
        },
        warnings
    };
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatPercentage(value) {
    return `${(value * 100).toFixed(1)}%`;
}

function displayResults(result) {
    document.getElementById('results').style.display = 'block';

    // Main results
    document.getElementById('totalCost').textContent = formatCurrency(result.totalNetCost);
    document.getElementById('monthlyPayment').textContent = formatCurrency(result.monthlyPayment);
    document.getElementById('frontEndRatio').textContent = formatPercentage(result.frontEndRatio);
    document.getElementById('downPaymentResult').textContent = formatCurrency(result.breakdown.downPayment);

    // Affordability status
    const statusElement = document.getElementById('affordabilityStatus');
    if (result.isAffordable) {
        statusElement.textContent = 'Affordable (≤28%)';
        statusElement.className = 'status affordable';
    } else {
        statusElement.textContent = 'Above 28% Rule';
        statusElement.className = 'status unaffordable';
    }

    // Breakdown
    const breakdownContainer = document.getElementById('breakdown');
    breakdownContainer.innerHTML = '';

    const breakdownItems = [
        { label: 'Annual Mortgage Payment', value: result.breakdown.annualMortgagePayment, type: 'negative' },
        { label: 'Property Tax', value: result.breakdown.propertyTax, type: 'negative' },
        { label: 'Insurance', value: result.breakdown.insurance, type: 'negative' },
        { label: 'Maintenance', value: result.breakdown.maintenance, type: 'negative' },
        { label: 'Stock gains lost from down payment', value: result.breakdown.opportunityCostUpfront, type: 'negative' },
        { label: 'Stock gains lost from mortage payment', value: result.breakdown.opportunityCostMortgagePayments, type: 'negative' },
        { label: 'Home Appreciation', value: -result.breakdown.homeAppreciationValue, type: 'positive' },
        { label: 'Mortgage Interest Tax Savings', value: -result.breakdown.mortgageInterestTaxSavings, type: 'positive' },
        { label: 'Property Tax Tax Savings', value: -result.breakdown.propertyTaxTaxSavings, type: 'positive' }
    ];

    breakdownItems.forEach(item => {
        const div = document.createElement('div');
        div.className = `breakdown-item ${item.type}`;
        div.innerHTML = `
            <span class="breakdown-label">${item.label}</span>
            <span class="breakdown-value">${formatCurrency(Math.abs(item.value))}</span>
        `;
        breakdownContainer.appendChild(div);
    });

    // Warnings
    const warningsSection = document.getElementById('warnings');
    const warningsList = document.getElementById('warningsList');

    if (result.warnings.length > 0) {
        warningsSection.style.display = 'block';
        warningsList.innerHTML = '';
        result.warnings.forEach(warning => {
            const li = document.createElement('li');
            li.textContent = warning;
            warningsList.appendChild(li);
        });
    } else {
        warningsSection.style.display = 'none';
    }

    // Scroll to results
    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

// Form submission handler
document.getElementById('calculatorForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const params = {
        housePrice: parseFloat(document.getElementById('housePrice').value),
        userIncome: parseFloat(document.getElementById('userIncome').value),
        propertyTaxRate: parseFloat(document.getElementById('propertyTaxRate').value),
        mortgageRate: parseFloat(document.getElementById('mortgageRate').value),
        homeAppreciation: parseFloat(document.getElementById('homeAppreciation').value),
        filingStatus: document.getElementById('filingStatus').value,
        downPaymentPercent: parseFloat(document.getElementById('downPayment').value),
        opportunityCostRate: parseFloat(document.getElementById('opportunityCost').value),
        maintenanceCostRate: parseFloat(document.getElementById('maintenanceCost').value),

    };

    const result = calculateHomeNetCost(params);
    displayResults(result);
});
