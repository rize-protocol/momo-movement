module momo_movement::momo {
    use std::bcs;
    use std::string;
    use std::vector;
    use aptos_std::table_with_length;
    use aptos_std::table_with_length::TableWithLength;
    use aptos_framework::account;
    use aptos_framework::event;
    use aptos_framework::event::EventHandle;

    use momo_movement::role::{get_admin, only_operator, only_admin};

    #[test_only]
    use std::string::utf8;
    #[test_only]
    use momo_movement::role;

    // error codes
    const E_ACCOUNT_ALREADY_EXIST: u64 = 1;
    const E_ACCOUNT_NOT_EXIST: u64 = 2;

    struct AccountCreateEvent has drop, store {
        account_hash: string::String,
    }

    struct MintEvent has drop, store {
        account_hash: string::String,
        uni_id: string::String,
        amount: u64
    }

    struct TransferEvent has drop, store {
        from: address,
        to: address,
        uni_id: string::String,
        amount: u64
    }

    struct ReferralBonusEvent has drop, store {
        account_hash: string::String,
        uni_id: string::String,
        amount: u64
    }

    struct TaskBonusEvent has drop, store {
        account_hash: string::String,
        uni_id: string::String,
        amount: u64
    }

    struct MomoGlobals has key {
        account_mapping: TableWithLength<string::String, u64>,

        account_create_events: EventHandle<AccountCreateEvent>,
        mint_events: event::EventHandle<MintEvent>,
        transfer_events: event::EventHandle<TransferEvent>,
        referral_bonus_events: EventHandle<ReferralBonusEvent>,
        task_bonus_events: EventHandle<TaskBonusEvent>,
    }

    fun init_module(sender: &signer) {
        move_to(sender, MomoGlobals {
            account_mapping: table_with_length::new(),

            account_create_events: account::new_event_handle<AccountCreateEvent>(sender),
            mint_events: account::new_event_handle<MintEvent>(sender),
            transfer_events: account::new_event_handle<TransferEvent>(sender),
            referral_bonus_events: account::new_event_handle<ReferralBonusEvent>(sender),
            task_bonus_events: account::new_event_handle<TaskBonusEvent>(sender),
        })
    }

    public entry fun create_account(sender: &signer, account_hash: string::String) acquires MomoGlobals {
        only_admin(sender);

        let global = borrow_global_mut<MomoGlobals>(@momo_movement);
        assert!(!table_with_length::contains(&global.account_mapping, account_hash), E_ACCOUNT_ALREADY_EXIST);

        table_with_length::add(&mut global.account_mapping, account_hash, 0);

        event::emit_event<AccountCreateEvent>(&mut global.account_create_events, AccountCreateEvent {
            account_hash,
        });
    }

    public entry fun create_account_and_mint_token(sender: &signer, account_hash: string::String, uni_id: string::String, amount: u64) acquires MomoGlobals {
        only_admin(sender);

        create_account(sender, account_hash);

        mint_token(sender, account_hash, uni_id, amount);
    }

    #[view]
    public fun account_exists(account_hash: string::String) : bool acquires MomoGlobals {
        let global = borrow_global<MomoGlobals>(@momo_movement);
        table_with_length::contains(&global.account_mapping, account_hash)
    }

    #[view]
    public fun momo_balance(account_hash: string::String): u64 acquires MomoGlobals {
        let global = borrow_global<MomoGlobals>(@momo_movement);
        assert!(table_with_length::contains(&global.account_mapping, account_hash), E_ACCOUNT_NOT_EXIST);

        *table_with_length::borrow(&global.account_mapping, account_hash)
    }

    public entry fun mint_token(sender: &signer, account_hash: string::String, uni_id: string::String, amount: u64) acquires MomoGlobals {
        only_operator(sender);

        let global = borrow_global_mut<MomoGlobals>(@momo_movement);
        let account_ref = table_with_length::borrow_mut(&mut global.account_mapping, account_hash);
        *account_ref = *account_ref + amount;

        event::emit_event<MintEvent>(&mut global.mint_events, MintEvent{
            account_hash,
            uni_id,
            amount,
        });
    }

    public entry fun batch_mint_token(sender: &signer, account_hash_list: vector<string::String>, uni_id: string::String, amount: u64) acquires MomoGlobals {
        only_operator(sender);

        let num_accounts = vector::length(&account_hash_list);
        let i = 0;
        while (i < num_accounts) {
            let account_hash = *vector::borrow(&account_hash_list, i);
            mint_token(sender, account_hash, uni_id, amount);
            i = i + 1;
        };
    }

    public entry fun referral_bonus(sender: &signer, account_hash: string::String, uni_id: string::String, amount: u64) acquires MomoGlobals {
        only_operator(sender);

        let global = borrow_global_mut<MomoGlobals>(@momo_movement);

        let account_ref = table_with_length::borrow_mut(&mut global.account_mapping, account_hash);
        *account_ref = *account_ref + amount;

        event::emit_event<ReferralBonusEvent>(&mut global.referral_bonus_events, ReferralBonusEvent{
            account_hash,
            uni_id,
            amount
        });
    }

    public entry fun task_bonus(sender: &signer, account_hash: string::String, uni_id: string::String, amount: u64) acquires MomoGlobals {
        only_operator(sender);

        let global = borrow_global_mut<MomoGlobals>(@momo_movement);

        let account_ref = table_with_length::borrow_mut(&mut global.account_mapping, account_hash);
        *account_ref = *account_ref + amount;

        event::emit_event<TaskBonusEvent>(&mut global.task_bonus_events, TaskBonusEvent{
            account_hash,
            uni_id,
            amount
        });
    }

    fun calculate_resource_account_address(user_account_hash: string::String): address {
        let owner = get_admin();
        let user_account_bytes = bcs::to_bytes(&user_account_hash);
        account::create_resource_address(&owner, user_account_bytes)
    }

    #[test(deployer=@momo_movement)]
    fun test_init(deployer: &signer) {
        init_for_testing(deployer);
        assert!(exists<MomoGlobals>(signer::address_of(deployer)), 0);
    }

    #[test(deployer=@momo_movement)]
    fun test_get_or_create_resource_account(deployer: &signer) acquires MomoGlobals {
        init_for_testing(deployer);

        let user_account_hash = utf8(b"hello world");
        create_account(deployer, user_account_hash);
        momo_balance(user_account_hash);
    }

    #[test(deployer = @momo_movement, attacker = @test_attacker)]
    #[expected_failure]
    fun test_get_or_create_resource_account_by_attacker(deployer: &signer, attacker: &signer) acquires MomoGlobals {
        init_for_testing(deployer);

        let user_account_hash = utf8(b"hello world");
        create_account(attacker, user_account_hash);
    }

    #[test(deployer=@momo_movement)]
    fun test_mint_token(deployer: &signer) acquires MomoGlobals {
        init_for_testing(deployer);

        let user_account_hash = utf8(b"hello world");
        create_account(deployer, user_account_hash);

        let coin_balance_before_deposit = momo_balance(user_account_hash);
        assert!(coin_balance_before_deposit == 0, 0);

        let mint_amount = 100_000_000;
        mint_token(deployer, user_account_hash, utf8(b""), mint_amount);

        let coin_balance_after_deposit = momo_balance(user_account_hash);
        assert!(coin_balance_after_deposit == mint_amount, 1);
    }

    #[test(deployer=@momo_movement)]
    #[expected_failure(abort_code = E_RESOURCE_ACCOUNT_NOT_EXIST)]
    fun test_batch_mint_token_not_exists(deployer: &signer) acquires MomoGlobals {
        init_for_testing(deployer);

        let mint_amount = 100_000_000;

        let account_hash1 = utf8(b"addr1");
        let account_hash2 = utf8(b"addr2");

        let receipts = vector::empty<string::String>();
        vector::push_back(&mut receipts, account_hash1);
        vector::push_back(&mut receipts, account_hash2);

        batch_mint_token(deployer, receipts, utf8(b""), mint_amount);
    }

    #[test(deployer=@momo_movement)]
    fun test_batch_mint_token(deployer: &signer) acquires MomoGlobals {
        init_for_testing(deployer);

        let mint_amount = 100_000_000;

        let account_hash1 = utf8(b"addr1");
        let account_hash2 = utf8(b"addr2");

        create_account(deployer, account_hash1);
        create_account(deployer, account_hash2);

        let receipts = vector::empty<string::String>();
        vector::push_back(&mut receipts, account_hash1);
        vector::push_back(&mut receipts, account_hash2);

        batch_mint_token(deployer, receipts, utf8(b""), mint_amount);

        let user_balance1 = momo_balance(account_hash1);
        let user_balance2 = momo_balance(account_hash2);

        assert!(user_balance1 == mint_amount, 0);
        assert!(user_balance2 == mint_amount, 1);
    }

    #[test(deployer = @momo_movement, resource_address = @test_attacker)]
    #[expected_failure(abort_code = E_RESOURCE_ACCOUNT_NOT_EXIST)]
    fun test_mint_token_with_invalid_resource_account(deployer: &signer, resource_address: &signer) acquires MomoGlobals {
        init_for_testing(deployer);

        let mint_amount = 100_000_000;
        mint_token(deployer, utf8(b"addr6"), utf8(b""), mint_amount);
    }

    #[test(deployer=@momo_movement)]
    fun test_referral_bonus(deployer: &signer) acquires MomoGlobals {
        init_for_testing(deployer);

        let user_account_hash1 = utf8(b"addr1");
        create_account(deployer, user_account_hash1);

        let amount = 100_000_000;
        referral_bonus(deployer, user_account_hash1, utf8(b""), amount);

        let inviterBalance = momo_balance(user_account_hash1);
        assert!(inviterBalance == amount, 1);
    }

    #[test_only]
    public fun init_for_testing(sender: &signer) {
        if (!account::exists_at(signer::address_of(sender))) {
            account::create_account_for_test(signer::address_of(sender));
        };
        init_module(sender);
        momo_coin::init_for_testing(sender);
        role::init_for_testing(sender);
    }
}
