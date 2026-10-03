# Marketplace category guide — v0.5.0

31 main categories and 331 subcategories. This is a broad initial marketplace catalogue, designed to be extended through the admin page. Existing category IDs remain stable.

## Research and decisions

Reviewed 3 October 2026. The structure is our marketplace design, informed by the catalogues below; it is not an official classification or a claim that suppliers have been vetted. Product types are subcategories; location, brand, condition and price remain filters. Shop collections remain separate from marketplace subcategories.

- MSME Global Mart construction catalogue: https://www.msmemart.com/msme/category/construction-and-real-estate/8 — construction materials, finishes and trade services.
- Justdial building catalogue: https://www.justdial.com/india/building-construction-materials_fil/510920929_3 — consumer-facing material groups.
- Material.biz: https://www.material.biz/ — bulk cement, aggregate, steel and related supplier groupings.
- Archiproducts building catalogue: https://www.archiproducts.com/in?context=building — building components and architectural products.
- IndiaMART directory: https://m-gke.imimg.com/ — racks, material handling and packaging groupings.

Construction material wholesalers appear under the material sold; warehouse equipment under Warehouse & site supplies; warehouse property under Property & spaces; storage services under Transport & logistics. Architects/design professionals and building contractors have separate departments. Icons use the installed Phosphor library, with text labels for accessibility.

## Install

This cumulative update includes v0.4.0 sample shops/templates. Extract its contents into the existing project folder, build, commit and push. Vercel redeploys automatically. For the sample catalogue no database action is needed. For an EXISTING dedicated marketplace Supabase database, run database/migrations/004_store_templates.sql (if not already applied), then database/migrations/005_categories.sql before deploying the new listing forms. For a new database use database/schema.sql and database/storage.sql; do not rerun the whole schema on an existing database. No remote database was changed by this update.

A category/subcategory mismatch is rejected by the database. Existing listings without subcategories remain valid. Used subcategories cannot be removed until their listings are reassigned. Existing custom category names/fields are preserved by migration; built-in subcategory arrays receive the researched defaults.

## Catalogue

### Clothing, fashion & handloom — TShirt

- Women's clothing
- Men's clothing
- Children's clothing
- T-shirts & tops
- Traditional phanek & innaphi
- Shawls & handloom textiles
- Footwear
- Bags & wallets
- Jewellery & accessories
- Tailoring materials
- School & work uniforms
- Pre-owned clothing

### Mobiles & accessories — DeviceMobile

- Smartphones
- Feature phones
- Tablets
- Phone cases & screen protectors
- Chargers & cables
- Power banks
- Smartwatches
- Mobile spare parts
- Refurbished phones

### Electronics, computers & AV — Desktop

- Laptops
- Desktop computers
- Computer components
- Monitors
- Printers & scanners
- Networking & Wi-Fi
- Headphones & speakers
- Cameras & lenses
- Televisions & projectors
- Gaming consoles
- AV installation equipment
- Smart home devices
- Recording & studio equipment

### Cars & commercial vehicles — Car

- Hatchbacks
- Sedans
- SUVs & crossovers
- MPVs & vans
- Electric cars
- Luxury & sports cars
- Pickup trucks
- Trucks & goods vehicles
- Buses & passenger vehicles
- Car parts & accessories
- Tyres & wheels
- Vehicle servicing

### Motorcycles & scooters — Motorcycle

- Commuter motorcycles
- Roadsters
- Sports motorcycles
- Touring & adventure bikes
- Scooters
- Electric motorcycles & scooters
- Motorcycle parts
- Helmets & riding gear
- Motorcycle servicing

### Furniture & home living — Armchair

- Sofas & seating
- Beds & mattresses
- Tables & desks
- Wardrobes & storage
- Office furniture
- Kitchen & dining furniture
- Curtains & soft furnishings
- Home decor
- Outdoor furniture
- Used furniture

### Construction materials — Wall

- Cement & binders
- Sand & aggregates
- Bricks & concrete blocks
- Ready-mix concrete
- TMT bars & reinforcement
- Structural steel sections
- Timber & plywood
- Roofing sheets & systems
- Doors, windows & frames
- Glass & glazing
- Insulation & acoustic materials
- Waterproofing & construction chemicals
- Precast concrete products
- Geotextiles & drainage materials
- Reclaimed building materials

### Architects, design & engineering — Blueprint

- Residential architects
- Commercial architects
- Interior designers
- Landscape designers
- Structural engineers
- Civil engineering consultants
- MEP design consultants
- Building plans & drafting
- 3D visualisation & rendering
- Land surveying
- Quantity surveying & estimation
- Project management consultants
- Town planning consultants

### Construction & trade contractors — HardHat

- General building contractors
- Civil works contractors
- Home renovation
- Masonry & plastering
- Roofing contractors
- Steel fabrication & welding
- Carpentry & joinery
- Painting contractors
- Flooring & tiling installers
- Waterproofing contractors
- Electrical contractors
- Plumbing contractors
- HVAC installers
- Demolition & site clearing
- Landscaping contractors

### Warehouse & site supplies — Warehouse

- Pallet racks
- Shelving & storage systems
- Pallets, crates & bins
- Pallet trucks & trolleys
- Forklifts & stackers
- Lifting hoists & slings
- Conveyors & loading equipment
- Packaging boxes & cartons
- Wrapping, strapping & tapes
- Weighing scales
- Warehouse labels & signage
- Tarpaulins & protective covers
- Site cabins & portable toilets
- Bulk material supply & distribution

### Tools, hardware & fasteners — Hammer

- Hand tools
- Power tools
- Drill bits & cutting discs
- Nuts, bolts & screws
- Locks, hinges & handles
- Welding equipment & supplies
- Measuring & testing tools
- Ladders & work platforms
- Workshop storage
- Abrasives & polishing
- Adhesives & sealants

### Electrical, lighting & solar — Lightning

- Wires & cables
- Switches & sockets
- Distribution boards & breakers
- Indoor lighting
- Outdoor & street lighting
- LED strips & decorative lighting
- Inverters & UPS
- Batteries & energy storage
- Solar panels
- Solar inverters & accessories
- Earthing & lightning protection
- EV charging equipment

### Plumbing, bathroom & water — Pipe

- Pipes & fittings
- Taps & mixers
- Toilets & sanitaryware
- Wash basins & sinks
- Showers & bathroom accessories
- Water storage tanks
- Pumps & motors
- Water heaters
- Water filtration & treatment
- Drainage & sewage systems
- Valves & meters

### Paint, flooring & interiors — PaintRoller

- Interior & exterior paint
- Primers & wall putty
- Tiles & mosaics
- Marble, granite & stone
- Wood & laminate flooring
- Vinyl & resilient flooring
- Wall panels & cladding
- Wallpaper
- False ceilings & gypsum
- Modular kitchens
- Laminates & veneers
- Interior partitions

### Machinery & equipment rental — Factory

- Excavators & earthmovers
- Concrete mixers & vibrators
- Compactors & road equipment
- Cranes & lifting equipment
- Generators
- Air compressors
- Scaffolding & shuttering
- Agricultural machinery
- Workshop machines
- Construction equipment hire
- Industrial machine spares

### Safety, security & fire equipment — ShieldCheck

- Helmets & site PPE
- Safety footwear & gloves
- Harnesses & fall protection
- Barriers & safety signage
- Fire extinguishers
- Fire alarms & detection
- CCTV & surveillance
- Access control & locks
- Security alarms
- First-aid kits
- Emergency lighting

### Property & spaces — Buildings

- Homes for sale
- Apartments for sale
- Residential land
- Agricultural land
- Homes & flats for rent
- Rooms & shared accommodation
- Shops & showrooms
- Offices & coworking
- Warehouses & godowns
- Industrial sheds & plots
- Property agents

### Transport & logistics — Truck

- Local delivery
- Goods vehicle hire
- Packers & movers
- Building material transport
- Courier services
- Freight forwarding
- Warehousing services
- Cold storage services
- Passenger vehicle rental

### Bicycles & cycling — Bicycle

- City & commuter bicycles
- Mountain bikes
- Road bicycles
- Kids bicycles
- Electric bicycles
- Cycling accessories
- Bicycle spare parts
- Bicycle repair

### Home & kitchen appliances — WashingMachine

- Refrigerators
- Washing machines
- Air conditioners
- Fans & air coolers
- Cooktops & stoves
- Microwaves & ovens
- Mixers & small appliances
- Vacuum cleaners
- Water purifiers
- Appliance spare parts

### Food, groceries & local produce — BowlFood

- Rice & grains
- Fresh vegetables
- Fresh fruit
- Pulses & spices
- Packaged local foods
- Baked goods & sweets
- Dairy & eggs
- Meat & fish
- Tea, coffee & beverages
- Ready-to-eat meals
- Wholesale groceries

### Farming, gardening & plants — Plant

- Seeds & seedlings
- Indoor plants
- Garden plants & saplings
- Pots & planters
- Soil & compost
- Fertilisers
- Garden tools
- Irrigation equipment
- Farm tools
- Animal feed
- Greenhouse supplies

### Beauty & personal care — Scissors

- Skincare
- Haircare
- Makeup
- Fragrances
- Grooming tools
- Salon equipment
- Salon & barber services
- Makeup artists
- Spa & wellness services

### Sports, fitness & outdoors — Barbell

- Fitness equipment
- Football & team sports
- Badminton & racquet sports
- Martial arts equipment
- Outdoor & camping gear
- Sports clothing
- Yoga accessories
- Fishing equipment
- Sports coaching

### Baby, kids & toys — Baby

- Toys & games
- Baby clothing
- Strollers & carriers
- Cots & nursery furniture
- Feeding accessories
- Kids learning materials
- Kids outdoor play
- Maternity accessories

### Pet supplies & care — PawPrint

- Pet food
- Pet accessories
- Beds & carriers
- Aquarium supplies
- Pet grooming
- Pet boarding
- Pet training

### Books, learning & stationery — GraduationCap

- School & college books
- Competitive exam books
- General books
- Stationery
- Art supplies
- School supplies
- Tuition & tutoring
- Language classes
- Computer & skills training
- Music & dance lessons

### Events, gifts & celebrations — Confetti

- Event planners
- Decorators
- Catering
- Photography & videography
- Sound & lighting hire
- Venues & halls
- Gifts & hampers
- Flowers & bouquets
- Wedding services
- Party supplies

### Business & professional services — Briefcase

- Accounting & bookkeeping
- Business consulting
- Website & app development
- Graphic design
- Printing & signage
- Digital marketing
- Translation
- Office equipment
- Retail POS systems
- Commercial cleaning

### Home, repair & local services — Wrench

- Appliance repair
- Mobile & computer repair
- Home cleaning
- Pest control
- Laundry & ironing
- Furniture repair
- Locksmiths
- Home maintenance
- Gardening services
- Water tank cleaning

### General retail & wholesale — Storefront

- Daily essentials
- Household supplies
- Kitchenware
- Reusable bags & containers
- Wholesale mixed goods
- Shop fixtures & displays
- Local crafts & souvenirs
- Seasonal goods
