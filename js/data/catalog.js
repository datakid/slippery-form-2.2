const RAW_PRODUCTS = [
    "Antacid Syp|B", "Acetazolamide 250mg|10 T", "Acetylcysteine Sachets|10 Sach",
    "Acetylsalicylic Acid 75mg|10 T", "Acetylsalicylic Acid 81mg|10 T", "Acyclovir 0.05 cream|Tube",
    "Aescin gel|Tube", "Allopurinol 100mg|10 T", "Alpha Chymotrypsin|Amp", "Alpha Lipoic Acid 300mg|10 T",
    "Alpha Lipoic Acid 600mg|10 T", "Amantadine HCL 100mg|10 T", "Amaryl 2mg (حكم قضائي)|30 T",
    "Ambroxol|10 T", "Ambroxol Syp|B", "Amiodarone 200mg|10 T", "Amitriptyline 10mg|10 T",
    "Amitriptyline 25mg|10 T", "Amlodipine 10mg|10T", "Amlodipine 10mg & Valsartan 160mg|10 T",
    "Amlodipine 5mg|10 T", "Amlodipine 5mg & Olmesartan 20mg|10 T", "Amlodipine 5mg & Valsartan 160mg|10 T",
    "Amlodipine, Olmesartan & HCT 10/40/25mg|10 T", "Amlodipine, Olmesartan & HCT 5/20/12.5mg|10 T",
    "Amoxicillin & Clavulanic acid 1 gm|10 T", "Anagrelide 0.5mg|10 T", "Andovimpamide 100mg (استثناء من مدير الفرع)|10 T",
    "Antacid|10 T", "Antibiotic & Corticosteroid cream|Tube", "Antifungal cream|Tube",
    "Anti-migraine|10 T", "Antirheumatic gel|Tube", "Apetryl 0.5mg ( الشئون الطبية)|10 T",
    "Apixaban 2.5mg|10 T", "Apixaban 5mg|10 T", "Aranesp 100mcg|Syringe", "Aripiprazole 30mg|10 T",
    "Artificial Tears|B", "Atorvastatin & Ezetimibe 20/10 mg|10 T", "Atorvastatin & Ezetimibe 40/10 mg|10 T",
    "Atorvastatin 20mg|10T", "Atorvastatin 40mg|10 T", "Atropine Sulphate ED|B",
    "Atropine Sulphate, Colchicine & Piperazine Sachets|12 Sach", "Avonex 30mcg (قرار لجنة)|Syringe",
    "Azathioprine 50 mg|10 T", "Beclomethasone & Salbutamol Inhalation|B", "Beclomethasone inhalation|B",
    "Bendamustin 100mg|vial", "Benztropine 2mg|10 T", "Betaferon (قرار لجنة)|Syringe", "Betahistine 8mg|10 T",
    "Betamethasone & Calcipotriol Cr.|Tube", "Betamethasone & Salicylic acid Lotion|B",
    "Betamethasone & Salicylic acid Oint.|Tube", "Betamethasone Cr.|Tube", "Betaxolol|B", "Bilichol|12 Cap",
    "Bional (قرار لجنة )|10 T", "Biperidene 2mg|10 T", "Bisoprolol 2.5mg|10 T", "Bisoprolol 5mg|10 T",
    "Bisoprolol 5mg & HCT 12.5mg|10 T", "Bleomycin 15 I.U|Vial", "Bosentan 62.5mg|10 T", "Brimonidine e.d|B",
    "Budesonide 160mcg & Formoterol 4.5mcg|B", "Bumetanide|10 T", "Cabergoline 0.5mg|2 T", "Caelyx|Vial",
    "Calcium 500mg|10 T", "Candesartan 16 mg|10 T", "Candesartan 16mg & HCT 12.5mg|10 T", "Candesartan 8mg|10 T",
    "Capecitabine 500mg|T", "Capoten 25mg (حكم قضائي)|10 T", "Captopril 50mg & HCT 25mg|10 T",
    "Carbamazepin 200mg|10 T", "Carbamazepin 400mg CR|10 T", "Carbamide cream|Tube", "Carbimazole 5mg|10 T",
    "Carboplatin 150mg|Vial", "Carboplatin 450mg|Vial", "Carfilzomib 60mg|Vial", "Carvedilol 12.5mg|10T",
    "Carvedilol 25mg|10 T", "Carvedilol 6.25mg|10 T", "Celecoxib 200mg|10 T", "Central Muscle Relaxant & Analgesic|10 T",
    "Cetirizine|10 T", "Cetuximab 100mg|Vial", "Chlorpromazine 100mg|10 T", "Cholecalciferol 10000IU|10 T",
    "Cholestyramine Sachets|12 Sach", "Chymotrypsin & Trypsin|10 T", "Cidophage 850mg (حكم قضائي)|10 T",
    "Cilostazole 100mg|10 T", "Cilostazole 50mg|10 T", "Cinacalcet 30mg|10 T", "Cinchocaine & Hydrocortisone cream|Tube",
    "Cinnarizine 25mg|10 T", "Cipralex 10mg (الشئون الطبية)|14 T", "Ciprapro (استثناء مدير الفرع)|10 T",
    "Ciprofloxacin 500mg|10 T", "Citalopram 20mg|7 T", "Citicoline 500mg|Amp", "Citicoline Syp|B",
    "Clobetasol Cream|Tube", "Clomipramine 25mg|10 T", "Clomipramine 75mg|10 T", "Clopidogrel 75mg|10 T",
    "Clotrimazole Cream|Tube", "Clotrimazole Soln.|B", "Clozapine 100mg|10 T", "Colchicine|10 T", "Cough Sedative|B",
    "Cyclosporin 50mg|5 T", "Cytarabine 1gm|Vial", "Dapagliflozin 10mg|10 T", "Dapagliflozin 5mg & Met. 1000mg|10 T",
    "Dapagliflozin 10mg & Met. 1000mg|10 T", "Darbepoetin Alpha (لجنه عليا)|Syringe", "Deferoxamine 500mg|Amp",
    "Dexamethasone , Neomycine & Polimyxin ED|B", "Dexamethasone , Neomycine & Polimyxin EO|Tube", "Diacerein 50mg|10 T",
    "Diclofenac gel|Tube", "Digestive|10 T", "Digoxine 0.25mg|10 T", "Diltiazem 60mg|10 T",
    "Diosmin 450mg & Hesperidin 50mg|10 T", "Domperidone 10mg|10 T", "Dorzolamide & Timolol ED|B",
    "Dostenix (حكم قضائي)|2 T", "Dothiepin 25mg|10 T", "Dothiepin 75mg|10 T", "Doxazosin 1mg|10 T",
    "Doxazosin 4mg|10 T", "Doxorubicin 20mg|Vial", "Doxycycline 100mg|10 Cap", "Duloxetine 30mg|10 T",
    "Empagliflozin 12.5mg & Met. 1000mg|10 T", "Empagliflozin 25mg|10 T", "Empagliflozin 25mg & Met. 1000mg|10 T",
    "Empagliflozin 5mg & Met. 1000mg|10 T", "Enalapril 20mg & HCT 12.5mg|10 T", "Endoxan 1g|Vial", "Endoxan 50mg|50T",
    "Enoxaparin 20mg|Syringe", "Enoxaparin 40mg|Syringe", "Enoxaparin 60mg|Syringe", "Enoxaparin 80mg|Syringe",
    "Entecavir 0.5mg|10 T", "Entecavir 1mg|10 T", "Erythropoietin alpha 4000IU|Vial", "Escitalopram 10mg|14T",
    "Esomeprazole 40 mg|10 Cap", "Estradiol Valerate & Norgestrel|21 T", "Ethamsylate 250 mg|10 T", "Etoposide 100mg|Amp",
    "Etoricoxib 120mg|10 T", "Etoricoxib 90mg|10 T", "Famotidine 20 mg|10 T", "Famotidine 40mg|10 T",
    "Febuxostat 40mg|10 T", "Febuxostat 80mg|10 T", "Fenofibrate 300mg|10 T", "Ferro Sanol Duodenal ( الشئون الطبية)|30 T",
    "Fexofenadine 120mg|10 T", "Fexofenadine 180mg|10 T", "Flavoxate 200mg|10 T", "Fluconazole 150mg|1 T",
    "Fluoxetine 20mg|10 T", "Fluticasone 125mcg & Salmeterol 25mcg|B", "Folic acid|10 T", "Formoterol|30 T",
    "Fucidic Acid Cream|Tube", "Furosemide 20mg & Spironolactone 50mg|10 T", "Gabapentin 100mg|10 T",
    "Gabapentin 400mg|10 T", "Galvus 50mg (حكم قضائي )|28 T", "Gastrobiotic 550mg (لجنه عليا)|10 T",
    "Gentamicin 80mg|Amp", "Gentamicin Cream|Tube", "Gilenya 0.5mg|28 Cap", "Ginkgo biloba|10 T",
    "Glibenclamide 5mg|10 T", "Glibenclamide 5mg & Met. 1000mg|10 T", "Glibenclamide 5mg & Met. 500mg|10 T",
    "Gliclazide 60mg|10 T", "Glimepiride 2mg|10 T", "Glimepiride 2mg & Met. 1000mg|10 T", "Glimepiride 3mg|10 T",
    "Glimepiride 4mg|10 T", "Glucosamine|10 T", "Gramicidin, Neomycin, Nystatin & Triamcinolone Cream|Tube",
    "Haloperidol 5mg|Amp", "Hexamine, Khellin & Piperazin Sachets|12 Sach", "Human chorionic gonadotropin|Amp",
    "Hydroxychloroquine|10 T", "Hydroxyurea|10 T", "Imipramine 25mg|10 T", "Indepamid 2.5 mg|10 T",
    "Indomethacin 100mg Supp.|10 Supp", "Insulin Isophane Protamine|Vial", "Insulin Isophane Protamine|Penfill",
    "Insulin Mix 70/30 (Insulin Isophane Protamine & Insulin Neutral Human)|Vial",
    "Insulin Mix 70/30 (Insulin Isophane Protamine & Insulin Neutral Human)|Penfill", "Insulin Neutral Human|Vial",
    "Insulin Neutral Human|Penfill", "Invega 100mg (قرار لجنة)|Syringe", "Invega 150mg (قرار لجنة)|Syringe",
    "Ipratropium & Salbutamol|Amp", "Irinotecan 100mg|Vial", "Iron|10 T", "Iruxol|Tube", "Isosorbide Mononitrate 20mg|10 T",
    "Ivabradine 5mg|10 T", "Ivabradine 7.5mg|10 T", "Ketosteril|100 T", "Ketotifen|10 T", "Lacosamide 100 mg|10 T",
    "Lactulose Syp|B", "Lamivudine|10 T", "Lamotrigine 100mg|10 T", "Latanoprost ED|B", "Laxative|10 T",
    "L-Carnitine Amp|Amp", "L-Carnitine Cap|10 Cap", "Leflunomide 20mg|10 T", "Lercanidipine 10mg|10 T",
    "Leucovorin Calcium 50mg|Amp", "Levetiracetam 1000mg|10 T", "Levetiracetam 500mg|10 T",
    "Levodopa & Carbidopa 250/25mg|10 T", "Levodopa, Carbidopa & Entacapone 150/37.5/200mg|10 T",
    "Levofloxacin 500mg|10 T", "Levothyroxine 100mcg|100 T", "Levothyroxine 25mcg|50 T", "Levothyroxine 50mcg|100 T",
    "Lidocaine cream|Tube", "Linezolid 600 mg|10 T", "Lithium Carbonate 400mg|10 T", "Lolawest (قرار لجنة )|6 Sach",
    "Long Acting Penicillin|Vial", "Losartan 50mg|10 T", "Losartan 50mg & HCT 12.5mg|10 T",
    "Magnesium Citrate Eff.|12 Sach", "Mayzent 0.25 mg (لجنة)|12 T", "Mebeverine 100mg & Sulpiride 25mg|10 T",
    "Meclofenoxate 500mg|10 T", "Memantine 10 mg|10 T", "Mesalazine 500mg|10 T", "Mesalazine Supp|28 Supp",
    "Metformin 500mg|10 T", "Metformin 850mg|10 T", "Methotrexate|Vial", "Methotrexate 2.5mg|10 T",
    "Methyl Folate (لجنة دواء)|10 T", "Methyldopa 250mg|10 T", "Metoclopramide 10mg|10 T", "Metoprolol 100mg|10 T",
    "Metoprolol 50mg|10 T", "Metronidazole 250mg|10 T", "Miconazole vaginal cream|Tube", "Minirin 60mcg (قرار لجنة)|30T",
    "Mometasone Cream|Tube", "Montelukast 10mg|10 T", "Mouth Wash|B", "Multivitamins|10 Cap", "Mycophenolate 180mg|10 T",
    "Mycophenolate 500mg|10 T", "Naftidrofuryl 200mg|10 T", "Naphazoline HCL 0.5mg & Chlorpheniramine maleate ED|B",
    "Napizole 20mg (حكم قضائي )|14 T", "Navelbin 20mg|T", "Nebivolol 2.5mg|10 T", "Nebivolol 5mg|10 T",
    "Nebivolol 5mg & HCT 12.5mg|10 T", "Nebivolol 5mg & HCT 25mg|10 T", "Neostigmine 15mg|10 T", "Nicorandil 10mg|10 T",
    "Nicorandil 20mg|10 T", "Nifedipine|10 T", "Nitroglycerin 2.5mg|10 Cap", "Nitroglycerin 5mg Patches|Patch",
    "Nitromak 2.5mg (حكم قضائي)|10 T", "Norethisterone|10 T", "N-plate|Syringe", "Ofev (حكم قضائي)|60 T",
    "Olanzapine 10mg|10 T", "Olmesartan 20mg|10 T", "Olmesartan 20mg & HCT 12.5mg|10 T", "Olmesartan 40mg|10 T",
    "Omega 3|10 T", "Omeprazole 20mg|7 T", "Omeprazole 40mg|10 T", "Opsumit 10mg|30 T", "Oxcarbazepine 300mg|10 T",
    "Oxybutynin 5mg|10 T", "Panthenol cream|Tube", "Pantoprazole 20mg|10 T", "Pantoprazole 40mg|10 T",
    "Paracetamol 500mg|10 T", "Pentasa (لجنة عليا)|10 T", "Pentasa Supp (لجنة عليا)|28 Supp",
    "Pentoxifylline 400mg|10 T", "Phenytoin 100mg|10 T", "Phenytoin 50mg|10 T", "Pimozide 4mg|10 T",
    "Piperazine, Hexamine & Khellin Eff.|12 Sach", "Piracetam 400mg|10 T", "Piracetam 800mg|10 T", "Piracetam Syp|B",
    "Pirfenex (حكم قضائي)|30 T", "Pirfenidone 200mg (قرار لجنة )|30 T", "Piroxicam 10mg|10 T", "Piroxicam 20mg|10 T",
    "Plendil 5mg (موافقة الشئون الطبية)|30 T", "Potassium|B", "Povidone Iodine Shampoo|B", "Pramipexol 0.25mg|10 T",
    "Pramipexol 1 mg|10 T", "Prednisolone 20mg|10 T", "Prednisolone 5mg|10 T", "Prednisolone ED|B",
    "Progesteron 100mg|10 Cap", "Progesteron 250mg|Amp", "Propafenone 150mg|10 T", "Propranolol 10mg|10 T",
    "Propranolol 40mg|10 T", "Propolis, Chamomile, Zinc Oxide & Honey Cream|Tube", "Propylthiouracil 50mg|10 T",
    "Pyridostigmine 60mg|10 T", "Quetiapine 100mg|10 T", "Quinidine sulphate 250mg|10T", "Ramipril 10mg|10 T",
    "Ramipril 2.5 mg|10 T", "Ramipril 5mg|10T", "Rasagiline 1mg|10 T", "Rebamipide|10 T", "Rebif 44mcg (قرار لجنة)|Syringe",
    "Rilutek (لجنة دواء)|56 T", "Riluzole 50mg|56 T", "Risperidone 1 mg|10 T", "Risperidone 2 mg|10 T",
    "Risperidone 3 mg|10 T", "Rivaroxaban 10mg|10 T", "Rivaroxaban 15mg|10 T", "Rivaroxaban 20mg|10 T",
    "Rivaroxban 2.5mg|10 T", "Rosuvastatin 20mg|10 T", "Rutin & Vit.C|10 T", "Salbutamol|10 T", "Salbutamol Inhaler|B",
    "Salbutamol Syp|B", "Sandostatin LAR|Syringe", "Sertraline 50 mg|10 T", "Sildenafil 20mg|10 T",
    "Sildenafil 50mg|10 T", "Sitagliptin 100mg|10 T", "Sitagliptin 50 mg & Met. 1000 mg|10 T", "Sodium Valproate 200mg|10 T",
    "Sodium Valproate 500mg|10 T", "Spiramycin 3MIU Tab|10 T", "Spironolactone 100 mg|10 T", "Spironolactone 25mg|10 T",
    "Stivarga 40mg|84T", "Sulphamethoxazole & Trimethoprim|10 T", "Sulphasalazine|10 T", "Tacrolimus 1mg|10 T",
    "Tamoxifen 10mg|10 T", "Tamsulosin 0.4mg|14T", "Tenofenamide 25mg|10 T", "Tenofovir 300mg|30 T",
    "Terbinafine 0.01 Cream|Tube", "Terbutaline|10 T", "Testosterone|Amp", "Tetracosactrin|Amp", "Theophylline 300mg|10 T",
    "Thrombonorm 0.5mg (لجنة عليا)|100 Cap", "Tiratam 1000 mg (تم الصرف بالاسم التجاري وفقا لتأشيرة الشئون الطبية)|10 T",
    "Tiratam 500mg (استثناء من مدير الفرع)|10 T", "Topiramate 100 mg|10 T", "Topiramate 25 mg|10 T", "Torsemide 20mg|10 T",
    "Tranexamic acid 500mg|10 T", "Travoprost ED|B", "Triamcinilone 40mg|Amp", "Trifluperazine 5mg (Stellasil)|10 T",
    "Trimebutine 200mg|10 T", "Trimetazidine 20mg|10 T", "Urinex|12 Cap", "Ursodeoxycholic acid 250mg|10 Cap",
    "Valcyte 450mg|60 T", "Valsartan 160mg|10T", "Valsartan 160mg & HCT 25mg|10 T", "Valsartan 40 mg|10 T",
    "Vastarel MR ( حكم قضائي )|30 T", "Verapamil 240mg|10 T", "Verapamil 80mg|10 T", "Vidaza 100mg|Vial",
    "Vildagliptin 50mg|10 T", "Vildagliptin 50mg & Metformin 1000mg|10 T", "Vildagliptin 50mg & Metformin 850mg|10 T",
    "Vildagluse plus 50/1000mg (حكم قضائي )|30 T", "Vinblastin 10mg|vial", "Vincamine 30mg|10 T", "Vincristine 1mg|Vial",
    "Vinorelbine 50mg|Vial", "Vitamin A|10 T", "Vitamin B amp|Amp", "Vitamin B comp|10 T", "Vitamin E 400|12 Cap",
    "Vitamin K|10 T", "Voriconazole 50mg|10 T", "Warfarin 1mg|10 T", "Warfarin 3mg|10 T", "Warfarin 5 mg|10 T",
    "Xarelto 20mg|28 T", "Xgeva|Vial", "Zoledronic 4mg|Vial"
];

export function normalizeUnit(unit) {
    return String(unit || '').trim().replace(/\s+/g, ' ').replace(/^(\d+)\s*([A-Za-z])/, '$1 $2');
}

export function productKey(name, unit) {
    return `${String(name || '').trim()}|${normalizeUnit(unit)}`;
}

function buildProducts() {
    const seen = new Map();
    const aliases = new Map();
    for (const raw of RAW_PRODUCTS) {
        const fixed = raw.replace('Rivaroxban', 'Rivaroxaban');
        const cut = fixed.lastIndexOf('|');
        const name = fixed.slice(0, cut).trim().replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
        const unit = normalizeUnit(fixed.slice(cut + 1));
        const key = `${name}|${unit}`;
        if (!seen.has(key)) {
            const noteMatch = name.match(/\(([^)]*[\u0600-\u06FF][^)]*)\)\s*$/);
            seen.set(key, {
                key,
                name,
                unit,
                base: noteMatch ? name.slice(0, noteMatch.index).trim() : name,
                note: noteMatch ? noteMatch[1].trim() : ''
            });
        }
        aliases.set(raw, key);
        aliases.set(fixed, key);
    }
    return { list: [...seen.values()], aliases };
}

const built = buildProducts();
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

export const PRODUCTS = built.list.sort((a, b) => collator.compare(a.name, b.name) || collator.compare(a.unit, b.unit));
export const PRODUCT_MAP = new Map(PRODUCTS.map(p => [p.key, p]));
export const PRODUCT_ALIASES = built.aliases;

export function findProduct(name, unit) {
    const direct = PRODUCT_MAP.get(productKey(name, unit));
    if (direct) return direct;
    const alias = PRODUCT_ALIASES.get(`${name}|${unit}`);
    if (alias) return PRODUCT_MAP.get(alias);
    const low = String(name || '').trim().toLowerCase();
    const lowUnit = normalizeUnit(unit).toLowerCase().replace(/\s+/g, '');
    return PRODUCTS.find(p => p.name.toLowerCase() === low && (!lowUnit || p.unit.toLowerCase().replace(/\s+/g, '') === lowUnit)) || null;
}

export const CLASSES = [
    { id: 'student', code: 'a', ar: 'طلاب', en: 'Students' },
    { id: 'workforce', code: 'b', ar: 'قوى عاملة', en: 'Workforce' },
    { id: 'infants', code: 'c', ar: 'مواليد', en: 'Infants' }
];

export const REGIONS = [
    { id: 'first', code: '1', ar: 'الاولى', en: 'First' },
    { id: 'second', code: '2', ar: 'الثانية', en: 'Second' },
    { id: 'third', code: '3', ar: 'الثالثة', en: 'Third' }
];

export const MONTHS = [
    { n: 1, en: 'January', ar: 'يناير' }, { n: 2, en: 'February', ar: 'فبراير' },
    { n: 3, en: 'March', ar: 'مارس' }, { n: 4, en: 'April', ar: 'ابريل' },
    { n: 5, en: 'May', ar: 'مايو' }, { n: 6, en: 'June', ar: 'يونيو' },
    { n: 7, en: 'July', ar: 'يوليو' }, { n: 8, en: 'August', ar: 'اغسطس' },
    { n: 9, en: 'September', ar: 'سبتمبر' }, { n: 10, en: 'October', ar: 'اكتوبر' },
    { n: 11, en: 'November', ar: 'نوفمبر' }, { n: 12, en: 'December', ar: 'ديسمبر' }
];

export const CONTEXTS = [
    { id: 'قرار لجنة', key: 'c', en: 'Committee decision' },
    { id: 'حكم قضائي', key: 'j', en: 'Court ruling' },
    { id: 'شئون طبية', key: 'm', en: 'Medical affairs' },
    { id: 'داخل اللستة', key: 'l', en: 'In the list' }
];

const PHARMACY_TREE = {
    student: {
        first: [["a11", "ابو المطامير طلاب"], ["a12", "ادكو طلاب"], ["a13", "البيضا طلاب"], ["a14", "النوبارية طلاب"], ["a15", "رشيد طلاب"], ["a16", "كفر الدوار طلاب"]],
        second: [["a21", "ابو حمص طلاب"], ["a22", "اورام طلاب"], ["a23", "الرحمانية طلاب"], ["a24", "المحمودية طلاب"], ["a25", "حوش عيسي طلاب"], ["a26", "دمنهور طلاب"]],
        third: [["a31", "ايتاي طلاب"], ["a32", "بدر طلاب"], ["a33", "الدلنجات طلاب"], ["a34", "كوم حمادة طلاب"], ["a35", "شبراخيت طلاب"]]
    },
    workforce: {
        first: [["b11", "ابو المطامير"], ["b12", "ادكو"], ["b13", "البيضا"], ["b14", "النوبارية"], ["b15", "رشيد"], ["b16", "كفر الدوار سكر"], ["b17", "كفر الدوار الشاملة 1"], ["b18", "كفر الدوار الشاملة 2"], ["b19", "كفر الدوار مسائي"]],
        second: [["b21", "ابو حمص"], ["b22", "الرحمانية"], ["b23", "المحمودية"], ["b24", "المحمودية مسائي"], ["b25", "حوش عيسي"], ["b26", "دمنهور الشاملة 1"], ["b27", "دمنهور الشاملة 2"], ["b28", "دمنهور سكر"], ["b29", "دمنهور مسائي"], ["b210", "دمنهور اورام"], ["b211", "الشرطة"]],
        third: [["b31", "ايتاي الشاملة 1"], ["b32", "ايتاي الشاملة 2"], ["b33", "ايتاي مسائي"], ["b34", "بدر"], ["b35", "الدلنجات"], ["b36", "كوم حمادة"], ["b37", "كوم حمادة مسائي"], ["b38", "شبراخيت"], ["b39", "قليشان"], ["b310", "وادي النطرون"], ["b311", "شبراخيت مسائي"], ["b312", "الدلنجات مسائي"]]
    },
    infants: {
        first: [["c11", "ابو المطامير مواليد"], ["c12", "ادكو مواليد"], ["c13", "البيضا مواليد"], ["c14", "النوبارية مواليد"], ["c15", "رشيد مواليد"], ["c16", "كفر الدوار مواليد"]],
        second: [["c21", "ابو حمص مواليد"], ["c22", "اورام مواليد"], ["c23", "الرحمانية مواليد"], ["c24", "المحمودية مواليد"], ["c25", "حوش عيسي مواليد"], ["c26", "دمنهور مواليد"]],
        third: [["c31", "ايتاي مواليد"], ["c32", "بدر مواليد"], ["c33", "الدلنجات مواليد"], ["c34", "كوم حمادة مواليد"], ["c35", "شبراخيت مواليد"]]
    }
};

export const PHARMACIES = Object.entries(PHARMACY_TREE).flatMap(([cls, regions]) =>
    Object.entries(regions).flatMap(([region, list]) =>
        list.map(([id, name]) => ({ id, name, cls, region }))
    )
);

export const PHARMACY_BY_ID = new Map(PHARMACIES.map(p => [p.id, p]));

export function pharmaciesFor(cls, region) {
    return PHARMACIES.filter(p => p.cls === cls && p.region === region);
}

export function classById(id) { return CLASSES.find(c => c.id === id) || null; }
export function regionById(id) { return REGIONS.find(r => r.id === id) || null; }
export function monthByNumber(n) { return MONTHS.find(m => m.n === Number(n)) || null; }
export function contextById(id) { return CONTEXTS.find(c => c.id === id) || null; }
