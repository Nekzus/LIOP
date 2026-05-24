/**
 * LIOP Industrial Mock Dataset Generator
 *
 * Dynamically produces scaled datasets for Bank, Market, and Medical records
 * to support scale testing of Sandbox and Differential Privacy engines.
 */

export function generateBankDataset(scale: number): any[] {
	const holders = [
		"Elena Rodriguez",
		"Jameson Sterling",
		"Aiko Tanaka",
		"Mateo Silva",
		"Chloe Dupont",
		"Hans Müller",
		"Sofia Loren",
		"Yuki Sato",
		"Omar Farooq",
		"Maria Rossi",
	];
	const types = ["Checking", "Savings", "Investment"];
	const currencies = ["USD", "EUR", "JPY", "GBP"];
	const txDescriptions = [
		"ATM Withdrawal",
		"Payroll Deposit",
		"Interest Credit",
		"Stock Purchase",
		"Online Transfer",
		"Groceries",
		"Utility Bill",
	];
	const list: any[] = [];

	// Always include the first 3 legacy records for compatibility
	list.push(
		{
			id: "ACC-9901",
			accountHolder: "Elena Rodriguez",
			accountType: "Checking",
			balance: 12450.75,
			currency: "USD",
			transactions: [
				{ date: "2026-03-10", amount: -150.0, description: "ATM Withdrawal" },
				{ date: "2026-03-15", amount: 2500.0, description: "Payroll Deposit" },
			],
		},
		{
			id: "ACC-2210",
			accountHolder: "Jameson Sterling",
			accountType: "Savings",
			balance: 85600.2,
			currency: "USD",
			transactions: [
				{ date: "2026-02-01", amount: 500.0, description: "Interest Credit" },
			],
		},
		{
			id: "ACC-5541",
			accountHolder: "Aiko Tanaka",
			accountType: "Investment",
			balance: 342100.0,
			currency: "JPY",
			transactions: [
				{
					date: "2026-03-20",
					amount: -50000.0,
					description: "Stock Purchase - NVDA",
				},
			],
		},
	);

	if (scale <= 1) return list;

	const targetCount = scale * 3;
	for (let i = 3; i < targetCount; i++) {
		const holder = holders[i % holders.length];
		const type = types[i % types.length];
		const currency = currencies[i % currencies.length];
		const balance = Number.parseFloat((Math.random() * 200000 + 100).toFixed(2));

		const transactions: any[] = [];
		const txCount = (i % 3) + 1; // 1 to 3 transactions
		for (let t = 0; t < txCount; t++) {
			const txAmount = Number.parseFloat((Math.random() * 1000 - 500).toFixed(2));
			const date = `2026-03-${String(((t + i) % 28) + 1).padStart(2, "0")}`;
			const desc = txDescriptions[(t + i) % txDescriptions.length];
			transactions.push({ date, amount: txAmount, description: desc });
		}

		list.push({
			id: `ACC-${1000 + i}`,
			accountHolder: `${holder} #${i}`,
			accountType: type,
			balance,
			currency,
			transactions,
		});
	}
	return list;
}

export function generateMarketDataset(scale: number): any[] {
	const list: any[] = [];
	list.push(
		{
			ticker: "NXS",
			companyName: "Nekzus Digital",
			price: 442.1,
			change: "+1.2%",
			volume: "1.2M",
			peRatio: 28.5,
			marketCap: "$42B",
		},
		{
			ticker: "LIOP",
			companyName: "Protocol Foundries",
			price: 89.45,
			change: "+5.7%",
			volume: "850K",
			peRatio: null,
			marketCap: "$8.9B",
		},
		{
			ticker: "WASM",
			companyName: "Sandbox Systems",
			price: 156.2,
			change: "-0.4%",
			volume: "2.1M",
			peRatio: 12.3,
			marketCap: "$15B",
		},
	);

	if (scale <= 1) return list;

	const targetCount = scale * 3;
	const tickers = [
		"AAPL",
		"MSFT",
		"GOOGL",
		"AMZN",
		"META",
		"TSLA",
		"NVDA",
		"AMD",
		"NFLX",
		"INTC",
	];
	const companies = [
		"Apple Inc.",
		"Microsoft Corp.",
		"Alphabet Inc.",
		"Amazon.com Inc.",
		"Meta Platforms",
		"Tesla Inc.",
		"Nvidia Corp.",
		"Advanced Micro Devices",
		"Netflix Inc.",
		"Intel Corp.",
	];

	for (let i = 3; i < targetCount; i++) {
		const ticker = tickers[i % tickers.length];
		const company = companies[i % companies.length];
		const price = Number.parseFloat((Math.random() * 900 + 10).toFixed(2));
		const changeNum = Number.parseFloat((Math.random() * 10 - 5).toFixed(2));
		const change = `${changeNum >= 0 ? "+" : ""}${changeNum}%`;
		const volume = `${(Math.random() * 5 + 0.1).toFixed(1)}M`;
		const peRatio =
			i % 5 === 0
				? null
				: Number.parseFloat((Math.random() * 40 + 5).toFixed(1));
		const marketCap = `$${(Math.random() * 500 + 1).toFixed(1)}B`;

		list.push({
			ticker: `${ticker}-${i}`,
			companyName: `${company} #${i}`,
			price,
			change,
			volume,
			peRatio,
			marketCap,
		});
	}
	return list;
}

export function generateMedicalDataset(scale: number): any[] {
	const list: any[] = [];
	list.push(
		{
			id: "PAT-7721",
			name: "Evelyn Reed",
			age: 42,
			bloodType: "O+",
			diagnosis: "Hypertension",
			lastVisit: "2026-01-15",
			medications: ["Lisinopril", "Amlodipine"],
		},
		{
			id: "PAT-1092",
			name: "Marcus Thorne",
			age: 58,
			bloodType: "A-",
			diagnosis: "Type 2 Diabetes",
			lastVisit: "2026-02-20",
			medications: ["Metformin", "Glipizide"],
		},
		{
			id: "PAT-4432",
			name: "Sarah Chen",
			age: 29,
			bloodType: "B+",
			diagnosis: "Acute Bronchitis",
			lastVisit: "2026-03-05",
			medications: ["Albuterol", "Amoxicillin"],
		},
		{
			id: "PAT-8819",
			name: "Julian Vane",
			age: 65,
			bloodType: "AB+",
			diagnosis: "Osteoarthritis",
			lastVisit: "2025-12-10",
			medications: ["Celecoxib", "Glucosamine"],
		},
		{
			id: "PAT-9901",
			name: "Elena Rodriguez",
			age: 35,
			bloodType: "O-",
			diagnosis: "Hypertension",
			lastVisit: "2026-03-25",
			medications: ["Metoprolol"],
		},
	);

	if (scale <= 1) return list;

	const targetCount = scale * 5;
	const names = [
		"Evelyn Reed",
		"Marcus Thorne",
		"Sarah Chen",
		"Julian Vane",
		"Elena Rodriguez",
		"David Miller",
		"Emma Watson",
		"Lucas Grey",
		"Olivia Smith",
		"James Ward",
	];
	const bloodTypes = ["O+", "A-", "B+", "AB+", "O-", "A+", "B-", "AB-"];
	const diagnoses = [
		"Hypertension",
		"Type 2 Diabetes",
		"Acute Bronchitis",
		"Osteoarthritis",
		"Asthma",
		"Allergic Rhinitis",
		"Gastroesophageal Reflux",
	];
	const medicationsList = [
		["Lisinopril", "Amlodipine"],
		["Metformin", "Glipizide"],
		["Albuterol", "Amoxicillin"],
		["Celecoxib", "Glucosamine"],
		["Metoprolol"],
		["Fluticasone", "Montelukast"],
		["Omeprazole", "Famotidine"],
	];

	for (let i = 5; i < targetCount; i++) {
		const name = names[i % names.length];
		const age = (i % 70) + 18; // 18 to 87
		const bloodType = bloodTypes[i % bloodTypes.length];
		const diagnosis = diagnoses[i % diagnoses.length];
		const lastVisit = `2026-02-${String((i % 28) + 1).padStart(2, "0")}`;
		const medications = medicationsList[i % medicationsList.length];

		list.push({
			id: `PAT-${8000 + i}`,
			name: `${name} #${i}`,
			age,
			bloodType,
			diagnosis,
			lastVisit,
			medications,
		});
	}
	return list;
}
